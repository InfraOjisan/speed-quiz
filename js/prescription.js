/**
 * Prescription Engine (prescription.js)
 * Generates "Immediately Effective Prescription for You" (すぐ効く！あなたへの処方箋)
 * based on accumulated weakness notebook and revenge recovery history.
 * Analyzes:
 *  - "Weak Subject" (苦手な科目)
 *  - "Recovering Subject" (苦手だけど前向きに克服しようとしている科目)
 *  - "Strong Subject" (得意な科目・間違いが少ない科目)
 * Highly compressed context with rich learning metrics.
 */

import { AIService } from './ai-service.js';

export class PrescriptionEngine {
  /**
   * 弱点履歴（未克服＆克服済み）と出題進捗から、
   * 科目ごとの「間違い数」「克服数」「克服率」を算出し、
   * 「苦手な科目」「苦手だけど前向きに克服しようとしている科目」「得意な科目」を判定
   * @param {Array} allWeaknesses 全弱点履歴（overcome含む）
   * @param {Object} categoryProgress storage.data.categoryProgress
   * @returns {Object}
   */
  static analyzeWeaknessMetrics(allWeaknesses = [], categoryProgress = {}) {
    const categoryStats = {};

    // 1. 弱点履歴からカテゴリごとの間違い・克服・未克服を集計
    allWeaknesses.forEach(w => {
      const cat = w.category || '一般教養';
      if (!categoryStats[cat]) {
        categoryStats[cat] = {
          category: cat,
          totalMistakes: 0,
          totalMissCount: 0,
          overcomeCount: 0,
          pendingCount: 0,
          overcomeRate: 0,
          seen: 0,
          correct: 0,
          accuracy: 0
        };
      }
      const st = categoryStats[cat];
      st.totalMistakes += 1;
      st.totalMissCount += (w.missCount || 1);
      if (w.overcome) {
        st.overcomeCount += 1;
      } else {
        st.pendingCount += 1;
      }
    });

    // 2. 出題進捗から各カテゴリの遭遇数・正解数を結合
    Object.entries(categoryProgress || {}).forEach(([catSubKey, prog]) => {
      const mainCat = catSubKey.split(' > ')[0] || catSubKey;
      if (!categoryStats[mainCat]) {
        categoryStats[mainCat] = {
          category: mainCat,
          totalMistakes: 0,
          totalMissCount: 0,
          overcomeCount: 0,
          pendingCount: 0,
          overcomeRate: 0,
          seen: 0,
          correct: 0,
          accuracy: 0
        };
      }
      const st = categoryStats[mainCat];
      st.seen += (prog.seenIds ? prog.seenIds.length : 0);
      st.correct += (prog.correctIds ? prog.correctIds.length : 0);
    });

    // 3. 率の計算
    Object.values(categoryStats).forEach(st => {
      if (st.totalMistakes > 0) {
        st.overcomeRate = Math.round((st.overcomeCount / st.totalMistakes) * 100);
      } else {
        st.overcomeRate = 100;
      }
      if (st.seen > 0) {
        st.accuracy = Math.round((st.correct / st.seen) * 100);
      } else {
        st.accuracy = st.totalMistakes === 0 ? 100 : 0;
      }
    });

    const statList = Object.values(categoryStats);

    // 全体の克服サマリー
    const totalStocked = allWeaknesses.length;
    const totalOvercome = allWeaknesses.filter(w => w.overcome).length;
    const totalPending = totalStocked - totalOvercome;
    const overallOvercomeRate = totalStocked > 0 ? Math.round((totalOvercome / totalStocked) * 100) : 100;

    // ① 苦手な科目 (pendingCount が最も多い、または overcomeRate が低くミスが多い科目)
    const pendingCats = statList.filter(s => s.pendingCount > 0)
      .sort((a, b) => b.pendingCount - a.pendingCount || a.overcomeRate - b.overcomeRate);
    
    let weakSubject = '';
    let weakSubjectDetail = '';
    if (pendingCats.length > 0) {
      weakSubject = pendingCats[0].category;
      weakSubjectDetail = `${weakSubject}（未克服${pendingCats[0].pendingCount}問 / 克服率${pendingCats[0].overcomeRate}%）`;
    } else if (totalStocked > 0) {
      const mostMissed = statList.slice().sort((a, b) => b.totalMistakes - a.totalMistakes)[0];
      weakSubject = mostMissed ? mostMissed.category : '全般';
      weakSubjectDetail = `${weakSubject}（過去${mostMissed?.totalMistakes || 0}問ミス・全克服済）`;
    } else {
      weakSubject = '特になし';
      weakSubjectDetail = '特になし（全科目ノーミス）';
    }

    // ② 苦手だけど前向きに克服しようとしている科目 (overcomeCount が1以上あり、克服率が高い、または克服数が最多)
    const recoveringCats = statList.filter(s => s.overcomeCount > 0)
      .sort((a, b) => b.overcomeCount - a.overcomeCount || b.overcomeRate - a.overcomeRate);
    
    let recoveringSubject = '';
    let recoveringSubjectDetail = '';
    if (recoveringCats.length > 0) {
      const topRec = recoveringCats[0];
      recoveringSubject = topRec.category;
      recoveringSubjectDetail = `${recoveringSubject}（誤答${topRec.totalMistakes}問中 ${topRec.overcomeCount}問を克服！克服率${topRec.overcomeRate}%）`;
    } else {
      recoveringSubject = '復習マッチ待機中';
      recoveringSubjectDetail = 'まだ克服済みの履歴がありません。30秒リベンジマッチに挑戦しましょう！';
    }

    // ③ 得意な科目（間違いが少ない科目）
    const strongCandidates = statList.filter(s => s.seen >= 3 || (s.totalMistakes === 0 && s.correct > 0))
      .sort((a, b) => {
        if (a.totalMistakes !== b.totalMistakes) return a.totalMistakes - b.totalMistakes;
        return b.accuracy - a.accuracy;
      });

    let strongSubject = '';
    let strongSubjectDetail = '';
    if (strongCandidates.length > 0 && strongCandidates[0].totalMistakes <= 1) {
      strongSubject = strongCandidates[0].category;
      strongSubjectDetail = `${strongSubject}（正解率${strongCandidates[0].accuracy}%・誤答${strongCandidates[0].totalMistakes}問のみ）`;
    } else {
      const leastMissed = statList.slice().sort((a, b) => a.totalMistakes - b.totalMistakes)[0];
      if (leastMissed) {
        strongSubject = leastMissed.category;
        strongSubjectDetail = `${strongSubject}（誤答率最小）`;
      } else {
        strongSubject = '基礎全般';
        strongSubjectDetail = '基礎全般（良好）';
      }
    }

    return {
      categoryStats,
      statList,
      totalStocked,
      totalOvercome,
      totalPending,
      overallOvercomeRate,
      weakSubject,
      weakSubjectDetail,
      recoveringSubject,
      recoveringSubjectDetail,
      strongSubject,
      strongSubjectDetail
    };
  }

  /**
   * 処方箋機能のアンロック状態と進捗を判定
   * ユーザー要望: 20セット（20回プレイ）か 100問くらい答えたあとに活性化
   * 克服後も履歴が残っているため、過去に間違えた履歴が1問以上あれば全克服後も利用可能
   * @param {Object} stats
   * @param {Array} allWeaknesses 全弱点履歴（overcome含む）
   * @param {Array} pendingWeaknesses 未克服の弱点リスト
   * @returns {Object}
   */
  static checkUnlockStatus(stats = {}, allWeaknesses = [], pendingWeaknesses = []) {
    const totalQuestions = stats.totalQuestionsAnswered || 0;
    const totalPlays = stats.totalPlays || 0;
    const stockedCount = allWeaknesses ? allWeaknesses.length : 0;
    const pendingCount = pendingWeaknesses ? pendingWeaknesses.length : 0;
    const overcomeCount = stockedCount - pendingCount;

    const reqQuestions = 100;
    const reqPlays = 20;

    const isQuestionDone = totalQuestions >= reqQuestions;
    const isPlayDone = totalPlays >= reqPlays;
    const hasEnoughExperience = isQuestionDone || isPlayDone;
    const hasHistory = stockedCount > 0;

    const qProgress = Math.min(100, Math.round((totalQuestions / reqQuestions) * 100));
    const pProgress = Math.min(100, Math.round((totalPlays / reqPlays) * 100));
    const progressPercent = Math.max(qProgress, pProgress);

    const isUnlocked = hasEnoughExperience && hasHistory;

    let statusText = '';
    let unlockHelp = '';

    if (isUnlocked) {
      if (pendingCount > 0) {
        statusText = '処方箋が発行可能です！';
        unlockHelp = `未克服${pendingCount}問と復習克服${overcomeCount}問の履歴から、Dr.AIが特効処方箋を調剤します。`;
      } else {
        statusText = '🎉 全弱点克服完了！（維持処方箋を発行可能）';
        unlockHelp = `蓄積弱点${stockedCount}問をすべて克服完了！更なる定着と得意を伸ばす維持処方箋を発行できます。`;
      }
    } else if (!hasEnoughExperience) {
      statusText = 'ロック中（経験値蓄積中）';
      const remainingQ = Math.max(0, reqQuestions - totalQuestions);
      const remainingP = Math.max(0, reqPlays - totalPlays);
      unlockHelp = `あと ${remainingQ}問解答 または あと ${remainingP}回プレイ で解放されます`;
    } else if (stockedCount === 0) {
      statusText = 'ノーミス健康体（弱点履歴なし）';
      unlockHelp = '現在、弱点ノートに記録がありません！クイズで新しい問題にどんどん挑戦しましょう。';
    }

    return {
      isUnlocked,
      hasEnoughExperience,
      hasHistory,
      totalQuestions,
      reqQuestions,
      totalPlays,
      reqPlays,
      stockedCount,
      pendingCount,
      overcomeCount,
      progressPercent,
      statusText,
      unlockHelp
    };
  }

  /**
   * 処方箋を生成 (LLM優先 -> ビルトインヒューリスティックにフォールバック)
   * @param {Array} allWeaknesses 全弱点履歴
   * @param {Array} pendingWeaknesses 未克服弱点
   * @param {Object} categoryProgress 出題進捗
   * @param {Object} player 
   * @param {Object} settings 
   * @param {Object} stats
   * @returns {Promise<Object>}
   */
  static async generatePrescription(allWeaknesses = [], pendingWeaknesses = [], categoryProgress = {}, player = {}, settings = {}, stats = {}) {
    const playerName = player.name || 'チャレンジャー';
    const stockedCount = allWeaknesses.length;

    if (stockedCount === 0) {
      throw new Error('弱点ノートの履歴がありません。');
    }

    // 科目別・克服履歴メトリクスを算出
    const metrics = this.analyzeWeaknessMetrics(allWeaknesses, categoryProgress);

    // 代表的な未克服問題を最大5問のみ抜粋（コンテキスト節約）
    const samplePending = pendingWeaknesses.slice(0, 5);

    // AI API キーが設定されている場合はガチ生成を試行
    if (settings.aiApiKey && settings.aiApiKey.trim()) {
      try {
        const aiResult = await this.generateViaLLM(samplePending, metrics, playerName, settings, stats);
        if (aiResult && aiResult.syndromeName) {
          return {
            ...aiResult,
            metrics,
            isAIGenerated: true,
            generatedAt: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('LLM Prescription generation failed, falling back to heuristic:', err);
      }
    }

    // ビルトインDr.AIヒューリスティック処方箋
    const heuristic = this.generateHeuristicPrescription(metrics, samplePending, playerName);
    return {
      ...heuristic,
      metrics,
      isAIGenerated: false,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * ガチめな生成AIによる処方箋生成（コンパクトかつ高密度プロンプト）
   */
  static async generateViaLLM(samplePending, metrics, playerName, settings, stats) {
    // 科目ごとのコンパクトサマリー行
    const categorySummaryLines = metrics.statList.map(st => {
      let tag = '';
      if (st.category === metrics.weakSubject) tag = ' ← 【要重点ケア】';
      else if (st.category === metrics.recoveringSubject) tag = ' ← 🔥【前向き克服中！】';
      else if (st.category === metrics.strongSubject) tag = ' ← ⭐【得意・安定】';
      return `・${st.category}: 誤答${st.totalMistakes}問中 ${st.overcomeCount}問を復習で克服 (克服率${st.overcomeRate}%), 正解率${st.accuracy}%${tag}`;
    }).join('\n');

    // 未克服問題の最小限サンプル（最大3〜5問）
    const sampleText = samplePending.length > 0 
      ? samplePending.map((w, idx) => {
          const qText = w.question ? w.question.slice(0, 60) : '';
          const ans = w.answer_bool !== undefined ? (w.answer_bool ? '○' : '×') : w.answer;
          return `${idx + 1}. [${w.category}] ${qText} (正解: ${ans}, ミス${w.missCount || 1}回)`;
        }).join('\n')
      : '（全問克服完了！現在、未克服問題は0問です）';

    const systemPrompt = `あなたは学習心理学・認知科学の最高権威である超高速学習クリニック院長「Dr.AI」です。
患者（プレイヤー）の学習統計と弱点・復習克服履歴を深層分析し、短時間で劇的に効く【あなた専用・特効学習処方箋】を調剤してください。
患者の「苦手な科目」を的確に突くだけでなく、「苦手だったが前向きに復習して克服しつつある科目」を大いに称賛して学習意欲を最高潮に高めてください。
出力は指定された純粋なJSONのみとし、Markdownの装飾コードブロックは含めないでください。`;

    const prompt = `【患者カルテ情報】
- 患者氏名: ${playerName}
- 累計解答数: ${stats.totalQuestionsAnswered || 0}問 / 累計プレイ回数: ${stats.totalPlays || 0}回
- 弱点ストック総数: ${metrics.totalStocked}問（うち復習で克服完了: ${metrics.totalOvercome}問、全体の克服率: ${metrics.overallOvercomeRate}%）
- 現在の未克服数: ${metrics.totalPending}問

【科目別・克服進捗データ】
${categorySummaryLines || '（データ集計中）'}

【現在の代表的な未克服問題サンプル】
${sampleText}

【出力JSONフォーマット（純粋なJSONのみ）】
{
  "prescriptionId": "RX-${Date.now().toString().slice(-6)}",
  "patientName": "${playerName}",
  "weakCategory": "${metrics.weakSubject}",
  "recoveringCategory": "${metrics.recoveringSubject}",
  "strongCategory": "${metrics.strongSubject}",
  "syndromeName": "思考の癖や克服傾向を表すクスッと笑えて鋭い弱点病名（例: 類似概念混同シンドローム、反復リベンジ覚醒熱、直感選択肢飛びつき癖 等）",
  "severity": "${metrics.totalPending === 0 ? '完全寛解（メンテナンス期）' : metrics.totalPending >= 6 ? '要集中トリートメント' : '中等度（順調に回復中）'}",
  "pathology": "思考の癖、なぜその選択肢に引っかかるのかの認知メカニズム、および復習で克服しつつある成長プロセスの深層分析（200〜300文字）",
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
  "doctorComment": "復習で積極的に克服した姿勢を大いに称賛し、苦手克服への自信を爆発させる熱血激励メッセージ（120〜180文字）",
  "disclaimer": "⚠️ 生成AIは正しくない回答を返すことがあります。本処方箋は学習支援を目的としたAI生成アドバイスであり、重要な事実関係や試験対策は公式テキスト・原典をご確認ください。"
}`;

    const rawText = await AIService.callChatCompletion(prompt, systemPrompt, settings, 1200);
    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  }

  /**
   * ビルトインDr.AIヒューリスティック処方箋
   * 苦手科目、前向き克服科目、得意科目を完璧に反映した高品質カルテ
   */
  static generateHeuristicPrescription(metrics, samplePending, playerName) {
    const isAllOvercome = metrics.totalPending === 0 && metrics.totalStocked > 0;
    const topCat = metrics.weakSubject || '一般教養';
    const recCat = metrics.recoveringSubject;
    const strCat = metrics.strongSubject;

    let syndromeName = '類似概念混同シンドローム';
    let pathology = '';
    let medicines = [];

    if (isAllOvercome) {
      syndromeName = '完全寛解・全問マスター覚醒シンドローム';
      pathology = `${playerName}さんのカルテを精査したところ、驚くべきことに過去にストックされた弱点全${metrics.totalStocked}問が「30秒リベンジマッチ」によって100%克服完了（完全寛解）しています！特に「${recCat}」における復習の徹底ぶりは目覚ましく、得意の「${strCat}」に匹敵する強固な記憶インデックスが構築されています。`;
      medicines = [
        {
          name: '💊 特効薬1: 【間隔反復メンテナンス法】',
          dosage: '3日後および1週間後',
          instruction: '一度完璧に覚えた知識も、3日後・7日後に0.5秒だけ思い出すことで「一生忘れない超長期記憶」へと固定されます。'
        },
        {
          name: '💊 特効薬2: 【難問ボーナス積極挑戦薬】',
          dosage: '通常タイムアタック時',
          instruction: '基礎が完璧に仕上がっているため、一発逆転の難問ボーナスに果敢に飛び込むことでスコアが爆発します。'
        },
        {
          name: '💊 特効薬3: 【他者解説アウトプット術】',
          dosage: 'いつでも',
          instruction: '覚えた知識を「誰かに教えるつもり」で心の中で一言要約すると、理解の解像度が極大化します。'
        }
      ];
    } else if (topCat.includes('理科') || topCat.includes('サイエンス') || topCat.includes('数学') || topCat.includes('算数')) {
      syndromeName = '数理・科学ショートサーキット症候群';
      pathology = `${playerName}さんのカルテを精査したところ、「${strCat}」で見せる鋭い知性の一方で、「${topCat}」分野において定義の細部と直感がわずかにズレて衝突するショートサーキット現象が確認されます。ただし「${recCat}」では着実に克服が進んでおり、前向きに復習する習慣が確実に実を結びつつあります。`;
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
          name: '💊 特効薬3: 【30秒リベンジ反復服用】',
          dosage: 'ミス直後',
          instruction: '弱点ノートのリベンジマッチで直後に上書きし、「${recCat}」と同様に克服リストへ送り込みましょう！'
        }
      ];
    } else if (topCat.includes('社会') || topCat.includes('歴史') || topCat.includes('地理') || topCat.includes('政治')) {
      syndromeName = '時空交錯・歴史人物シャッフル熱';
      pathology = `${playerName}さんの頭脳は処理速度が極めて優れる一方、「${topCat}」分野において似た時代や同カテゴリの固有名詞が脳内メモリ内で急速シャッフルされてしまう傾向が検知されました。しかし「${recCat}」で見せた粘り強い復習力があれば、因果関係の線を結ぶだけで一気に得意科目へと大化けします。`;
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
          instruction: '弱点ノートの「30秒リベンジマッチ」で同じ問題を2回連続正解するまで叩き込み、検索インデックスを完全上書きします。'
        }
      ];
    } else {
      syndromeName = '選択肢直感飛びつき・類似概念混同シンドローム';
      pathology = `${playerName}さんは「${strCat}」のような得意領域では圧倒的な正確さを発揮しています。その一方で「${topCat}」ではもっともらしく作られたトラップ選択肢に反射的に指が動いてしまう傾向が見受けられます。しかし「${recCat}」を積極的に復習して克服している向上心は本物です。一瞬の確認を挟むだけで完全無欠の頭脳が完成します。`;
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
          instruction: '処方箋を読んだ直後に「30秒リベンジマッチ」を開始し、脳が熱いうちに正しい神経回路を定着させましょう！'
        }
      ];
    }

    const rxCode = 'RX-' + Math.floor(1000 + Math.random() * 9000);

    return {
      prescriptionId: rxCode,
      patientName: playerName,
      weakCategory: metrics.weakSubject,
      recoveringCategory: metrics.recoveringSubject,
      strongCategory: metrics.strongSubject,
      syndromeName,
      severity: isAllOvercome ? '完全寛解（メンテナンス期）' : metrics.totalPending >= 6 ? '要集中トリートメント' : '中等度（順調に回復中）',
      pathology,
      medicines,
      doctorComment: isAllOvercome
        ? `素晴らしい！蓄積された弱点を1問残らず克服したあなたの実行力と集中力は本物です。「${strCat}」の強みを活かしつつ、このメンテナンス処方を意識すれば、どんな新問が来ても完全無敵です！`
        : `ミスの傾向が明確に掴めているだけでなく、「${recCat}」で自ら弱点を克服しようと立ち向かっている姿勢が何より素晴らしいです！「${strCat}」の安定感も抜群。処方薬を意識してリベンジマッチに臨めば、あっという間に全問マスターへ覚醒しますよ！`,
      disclaimer: '⚠️ 本処方箋は学習支援アルゴリズムに基づいたアドバイスです。生成AI等の出力は必ずしも正確とは限りませんので、重要な試験対策や事実関係は教科書・公式テキストをご確認ください。'
    };
  }

  /**
   * クリップボードやSNS共有用のフォーマットテキスト
   */
  static formatForShare(prescription) {
    const medsText = (prescription.medicines || []).map(m => {
      return `${m.name}\n・用法: ${m.dosage}\n・処方: ${m.instruction}`;
    }).join('\n\n');

    return `🏥【SpeedQuiz 特効学習処方箋】🏥
カルテNo: ${prescription.prescriptionId}
患者名: ${prescription.patientName} 様
病名: 【${prescription.syndromeName}】
診断深刻度: ${prescription.severity}

📊 学習特性分析:
❌ 要重点ケア: ${prescription.weakCategory || 'なし'}
🔥 前向き克服中: ${prescription.recoveringCategory || 'なし'}
⭐ 得意・安定: ${prescription.strongCategory || '全般'}

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
