/**
 * Prescription Engine (prescription.js)
 * Generates "Immediately Effective Prescription for You" (すぐ効く！あなたへの処方箋)
 * based on accumulated weakness notebook (revenge deck).
 * Supports both advanced LLM generation (via AIService) and rich heuristic doctor fallback.
 */

import { AIService } from './ai-service.js';

export class PrescriptionEngine {
  /**
   * 処方箋機能のアンロック状態と進捗を判定
   * ユーザー要望: 20セット（20回プレイ）か 100問くらい答えたあとに活性化
   * @param {Object} stats
   * @param {Array} pendingWeaknesses
   * @returns {Object}
   */
  static checkUnlockStatus(stats = {}, pendingWeaknesses = []) {
    const totalQuestions = stats.totalQuestionsAnswered || 0;
    const totalPlays = stats.totalPlays || 0;
    const weakCount = pendingWeaknesses ? pendingWeaknesses.length : 0;

    const reqQuestions = 100;
    const reqPlays = 20;

    const isQuestionDone = totalQuestions >= reqQuestions;
    const isPlayDone = totalPlays >= reqPlays;
    const hasEnoughExperience = isQuestionDone || isPlayDone;
    const hasWeakness = weakCount > 0;

    // 進捗率の計算 (問題数またはプレイ回数の進捗が高い方を採用)
    const qProgress = Math.min(100, Math.round((totalQuestions / reqQuestions) * 100));
    const pProgress = Math.min(100, Math.round((totalPlays / reqPlays) * 100));
    const progressPercent = Math.max(qProgress, pProgress);

    const isUnlocked = hasEnoughExperience && hasWeakness;

    let statusText = '';
    let unlockHelp = '';

    if (isUnlocked) {
      statusText = '処方箋が発行可能です！';
      unlockHelp = `未克服の弱点${weakCount}問から、Dr.AIが特効処方箋を調剤します。`;
    } else if (!hasEnoughExperience) {
      statusText = 'ロック中（経験値蓄積中）';
      const remainingQ = Math.max(0, reqQuestions - totalQuestions);
      const remainingP = Math.max(0, reqPlays - totalPlays);
      unlockHelp = `あと ${remainingQ}問解答 または あと ${remainingP}回プレイ で解放されます`;
    } else if (weakCount === 0) {
      statusText = '完全健康体（弱点なし）';
      unlockHelp = '現在、未克服の弱点がありません！クイズで新しい知識に挑戦しましょう。';
    }

    return {
      isUnlocked,
      hasEnoughExperience,
      hasWeakness,
      totalQuestions,
      reqQuestions,
      totalPlays,
      reqPlays,
      weakCount,
      progressPercent,
      statusText,
      unlockHelp
    };
  }

  /**
   * 処方箋を生成 (LLM優先 -> ビルトインヒューリスティックにフォールバック)
   * @param {Array} pendingWeaknesses 
   * @param {Object} player 
   * @param {Object} settings 
   * @returns {Promise<Object>}
   */
  static async generatePrescription(pendingWeaknesses = [], player = {}, settings = {}) {
    const playerName = player.name || 'チャレンジャー';
    const weakCount = pendingWeaknesses.length;

    if (weakCount === 0) {
      throw new Error('未克服の弱点問題がありません。');
    }

    // 代表的な弱点問題を最大12問サンプリング
    const sampleWeaknesses = pendingWeaknesses.slice(0, 12);

    // AI API キーが設定されている場合はガチ生成を試行
    if (settings.aiApiKey && settings.aiApiKey.trim()) {
      try {
        const aiResult = await this.generateViaLLM(sampleWeaknesses, playerName, settings);
        if (aiResult && aiResult.syndromeName) {
          return {
            ...aiResult,
            isAIGenerated: true,
            generatedAt: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('LLM Prescription generation failed, falling back to heuristic:', err);
      }
    }

    // ビルトインDr.AIヒューリスティック処方箋
    const heuristic = this.generateHeuristicPrescription(pendingWeaknesses, playerName);
    return {
      ...heuristic,
      isAIGenerated: false,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * ガチめな生成AIによる処方箋生成
   */
  static async generateViaLLM(sampleWeaknesses, playerName, settings) {
    const weakListText = sampleWeaknesses.map((w, idx) => {
      const qText = w.question ? w.question.slice(0, 70) : '';
      const ans = w.answer_bool !== undefined ? (w.answer_bool ? '○' : '×') : w.answer;
      const exp = w.explanation ? w.explanation.slice(0, 60) : '';
      return `${idx + 1}. [${w.category || '総合'}] 問: ${qText} / 正解: ${ans} / 解説要点: ${exp} (ミス回数: ${w.missCount || 1})`;
    }).join('\n');

    const systemPrompt = `あなたは学習心理学・認知科学の最高権威である超高速学習クリニック院長「Dr.AI」です。
プレイヤーが間違えた問題ログを徹底的に分析し、脳の思考の死角や認知バイアスを解明し、今すぐ実践できて即効性のある「あなた専用・特効処方箋」を調剤してください。
知的かつユーモアに富み、最後はプレイヤーの学習意欲を最高潮に高める熱いメッセージにしてください。
出力は指定された純粋なJSONのみとし、Markdownの装飾コードブロックは含めないでください。`;

    const prompt = `【患者カルテ情報】
- 患者氏名: ${playerName}
- 未克服弱点問題数: ${sampleWeaknesses.length}問
- 弱点問題サンプルログ:
${weakListText}

【出力JSONフォーマット】
{
  "prescriptionId": "RX-${Date.now().toString().slice(-6)}",
  "patientName": "${playerName}",
  "syndromeName": "クスッと笑えて核心を突いた弱点病名（例: 類似概念混同シンドローム、選択肢直感飛びつき熱、定義ウッカリ症候群 等）",
  "severity": "軽度 / 中等度 / 要集中トリートメント のいずれか",
  "pathology": "思考の癖・なぜこの選択肢や問題に引っかかってしまうのかの脳内認知メカニズム分析（200〜300文字）",
  "primaryWeakCategory": "最も集中的に対策すべき重点科目・分野",
  "medicines": [
    {
      "name": "💊 特効薬1: 【○○インプット術】",
      "dosage": "1日1回・問題文を読む前",
      "instruction": "具体的な覚え方や頭の整理テクニック（80〜120文字）"
    },
    {
      "name": "💊 特効薬2: 【○○トラップ見破り眼】",
      "dosage": "選択肢を選ぶ直前の1秒",
      "instruction": "出題者のひっかけを見破る着眼点（80〜120文字）"
    },
    {
      "name": "💊 特効薬3: 【30秒反芻ルーティン】",
      "dosage": "就寝前または休憩時",
      "instruction": "短期記憶を長期記憶に定着させる即効ルーティン（80〜120文字）"
    }
  ],
  "doctorComment": "Dr.AIからの熱血激励・温かい処方メッセージ（120〜180文字）",
  "disclaimer": "⚠️ 生成AIは正しくない回答を返すことがあります。本処方箋は学習支援を目的としたAI生成アドバイスであり、重要な事実関係や試験対策は公式テキスト・原典をご確認ください。"
}`;

    const rawText = await AIService.callChatCompletion(prompt, systemPrompt, settings, 1200);
    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  }

  /**
   * ビルトインDr.AIヒューリスティック処方箋（オフライン・APIキー未設定時でも高品質に生成）
   */
  static generateHeuristicPrescription(pendingWeaknesses, playerName) {
    // カテゴリごとの弱点数を集計
    const catCounts = {};
    pendingWeaknesses.forEach(w => {
      const cat = w.category || '教養・総合';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats[0] ? sortedCats[0][0] : '一般教養';
    const topCatCount = sortedCats[0] ? sortedCats[0][1] : pendingWeaknesses.length;

    // 弱点傾向に応じた病名と病理分析の選定
    let syndromeName = '類似概念混同シンドローム';
    let pathology = '';
    let medicines = [];

    if (topCat.includes('理科') || topCat.includes('サイエンス') || topCat.includes('数学') || topCat.includes('算数')) {
      syndromeName = '数理・科学ショートサーキット症候群';
      pathology = `${playerName}さんのカルテを精査したところ、特に「${topCat}」分野（計${topCatCount}問）において、定義や法則の細部と直感がわずかにズレて衝突するショートサーキット現象が確認されます。基礎理解は極めて高いものの、問題文の前提条件を読み飛ばして即座にタップしてしまう癖が主な要因です。`;
      medicines = [
        {
          name: '💊 特効薬1: 【主語・単位の指差し呼称法】',
          dosage: '問題文の読了直後',
          instruction: '「何を聞かれているか（単位、主語、例外か）」を一文字だけ心の中で指差し確認してから選択肢を見ましょう。'
        },
        {
          name: '💊 特効薬2: 【逆張り検証メンタル】',
          dosage: '「絶対これだ！」と思った瞬間',
          instruction: '直感で選んだ選択肢の反対理由を0.5秒だけ考えることで、巧妙な引っかけトラップを100%回避できます。'
        },
        {
          name: '💊 特効薬3: 【30秒イメージ復習法】',
          dosage: 'ミス直後または就寝前',
          instruction: '間違えた原理・用語を図やアニメーションとして頭の中で30秒間だけ思い浮かべることで、長期記憶化します。'
        }
      ];
    } else if (topCat.includes('社会') || topCat.includes('歴史') || topCat.includes('地理') || topCat.includes('政治')) {
      syndromeName = '時空交錯・歴史人物シャッフル熱';
      pathology = `${playerName}さんの頭脳は情報処理が極めてスピーディーな反面、「${topCat}」分野（計${topCatCount}問）において、似た時代や同カテゴリの固有名詞が脳内メモリ内で急速シャッフルされてしまう傾向が検知されました。知識の点と点はあるものの、因果関係の線がまだ結びついていません。`;
      medicines = [
        {
          name: '💊 特効薬1: 【なぜなぜストーリー法】',
          dosage: '用語や人名を覚える時',
          instruction: '単語単体ではなく「なぜその事件が起きたか」「何のためにその人物が動いたか」の因果関係で1文記憶しましょう。'
        },
        {
          name: '💊 特効薬2: 【対比ペアリング眼】',
          dosage: '紛らわしい選択肢を見た時',
          instruction: '「織田と徳川」「太平洋と日本海」など、混同しやすい2項目をセットで比較する習慣をつけると即座に見破れます。'
        },
        {
          name: '💊 特効薬3: 【30秒リベンジ反復ルーティン】',
          dosage: '本アプリの弱点ノート',
          instruction: '弱点ノートの「30秒リベンジマッチ」で同じ問題を2回連続で正解するまで叩き込み、脳の検索インデックスを上書きします。'
        }
      ];
    } else if (topCat.includes('IT') || topCat.includes('情報') || topCat.includes('英語') || topCat.includes('国際')) {
      syndromeName = 'グローバル・サイバー用語ボラティリティ熱';
      pathology = `${playerName}さんは先端の知識へのアンテナが高い反面、「${topCat}」分野においてアルファベット略語や専門用語の境界線が曖昧になり、類似の用語に飛びついてしまう傾向が見られます。略語の元の英語の意味や役割を紐付けることで劇的に改善します。`;
      medicines = [
        {
          name: '💊 特効薬1: 【略語フルスペル展開法】',
          dosage: 'アルファベット3〜4文字を見た時',
          instruction: '略語の頭文字が何の英語なのか（例: CPUならCentral Processing Unit）を一度だけ意識すると意味が頭に刻まれます。'
        },
        {
          name: '💊 特効薬2: 【役割ワンフレーズ化】',
          dosage: '難解な用語に出会った時',
          instruction: '「要するに○○するやつ」と自分だけの小学生にも通じる10文字の言葉で要約してラベルを貼りましょう。'
        },
        {
          name: '💊 特効薬3: 【日常アナロジー接続】',
          dosage: '1日1回・休憩時間',
          instruction: '専門概念を「日常生活の身近な道具（電話、郵便、道路など）」に例えることで、一生忘れない強固な記憶になります。'
        }
      ];
    } else {
      syndromeName = '選択肢直感飛びつき・類似概念混同シンドローム';
      pathology = `${playerName}さんの解答データから、圧倒的な反射神経と攻撃的な解答スピードが窺えます。その一方で、「${topCat}」を含む計${pendingWeaknesses.length}問の弱点では、もっともらしく作られたトラップ選択肢に反射的に指が動いてしまう傾向が確認されました。スピードを落とさず「最後の一瞬の確認」を挟むだけで爆発的な得点向上が見込めます。`;
      medicines = [
        {
          name: '💊 特効薬1: 【0.2秒のブレス・ストップ法】',
          dosage: '選択肢を押す直前',
          instruction: '指が画面に触れる直前に「0.2秒だけ息を止めて問題文末尾（〜でないもの／〜であるもの）を再視認」してください。'
        },
        {
          name: '💊 特効薬2: 【消去法スナイパー】',
          dosage: '2択で迷った瞬間',
          instruction: '「正解を探す」のではなく「絶対に違う明らかなウソ選択肢を1つ撃ち落とす」アプローチを取ると正解率が跳ね上がります。'
        },
        {
          name: '💊 特効薬3: 【弱点30秒リベンジの即時服用】',
          dosage: '今すぐ',
          instruction: 'この処方箋を読んだ直後に「30秒リベンジマッチ」を開始し、脳が熱いうちに正しい神経回路を定着させましょう！'
        }
      ];
    }

    const rxCode = 'RX-' + Math.floor(1000 + Math.random() * 9000);

    return {
      prescriptionId: rxCode,
      patientName: playerName,
      syndromeName,
      severity: pendingWeaknesses.length >= 8 ? '要集中トリートメント' : pendingWeaknesses.length >= 4 ? '中等度' : '軽度（良好）',
      pathology,
      primaryWeakCategory: topCat,
      medicines,
      doctorComment: `大丈夫、ミスの傾向がここまでハッキリ掴めているということは、弱点克服の鍵をすでに手に入れたも同然です！${playerName}さんの頭脳スペックは一流。処方薬を意識してリベンジマッチに臨めば、一瞬で全問マスターへ覚醒しますよ！`,
      disclaimer: '⚠️ 本処方箋は学習支援アルゴリズムに基づいたアドバイスです。生成AI等の出力は必ずしも正確とは限りませんので、重要な試験対策や事実関係は教科書・公式テキストをご確認ください。'
    };
  }

  /**
   * クリップボードやSNS共有用のフォーマットテキスト
   */
  static formatForShare(prescription) {
    const medsText = (prescription.medicines || []).map((m, idx) => {
      return `${m.name}\n・用法: ${m.dosage}\n・処方: ${m.instruction}`;
    }).join('\n\n');

    return `🏥【SpeedQuiz 特効学習処方箋】🏥
カルテNo: ${prescription.prescriptionId}
患者名: ${prescription.patientName} 様
病名: 【${prescription.syndromeName}】
診断深刻度: ${prescription.severity}
重点治療分野: ${prescription.primaryWeakCategory}

🔬 病理分析:
${prescription.pathology}

💊 即効特効薬 3選:
${medsText}

👨‍⚕️ Dr.AI所見:
${prescription.doctorComment}

${prescription.disclaimer}
#SpeedQuiz #弱点克服処方箋 #AI診断`;
  }
}
