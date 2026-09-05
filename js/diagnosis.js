/**
 * AI Personality & Type Diagnosis Engine (diagnosis.js)
 * Analyzes telemetry log to generate historical/personality diagnosis, MBTI-style code,
 * and dynamic avatar image generation with Canvas / external LLM.
 */

class DiagnosisEngine {
  constructor() {}

  // テレメトリデータから診断結果を生成
  async generateDiagnosis(telemetry, settings) {
    // 外部LLM APIキーが設定されている場合は本物のLLMを呼び出し
    if (settings && settings.aiApiKey && settings.aiApiKey.trim().length > 5) {
      try {
        const llmResult = await this.callLLMAPI(telemetry, settings);
        if (llmResult) return llmResult;
      } catch (err) {
        console.warn('LLM API call failed, falling back to heuristic engine:', err);
      }
    }

    // ビルトイン高精度ヒューリスティック診断エンジン
    return this.generateHeuristicDiagnosis(telemetry);
  }

  // ビルトイン診断ロジック（ユーザー指定テンプレートに完全準拠＋最後を大いに持ち上げる）
  generateHeuristicDiagnosis(telemetry) {
    const { playerName = 'チャレンジャー', avgSpeed = 2.0, accuracy = 70, postErrorReaction, topSubject, weakSubject, score, maxCombo, bonusSolved, weakCount = 0 } = telemetry;

    const nameStr = playerName || 'チャレンジャー';
    const topStr = topSubject || '基礎教養科目';
    const weakStr = weakSubject || '一部の応用知識';

    let styleDesc = '';
    let historicalFigure = '';
    let celebrity = '';
    let mbti = '';
    let tag = '';
    let avatarTheme = 'lightning';
    let adviceAndPraise = '';

    if (avgSpeed < 1.2 && accuracy >= 80) {
      styleDesc = '迷いのない神速の判断力と研ぎ澄まされた直感';
      historicalFigure = '織田信長（電光石火の覇王）';
      celebrity = 'イチロー / カズレーザー';
      mbti = 'ENTJ-A';
      tag = '神速の絶対覇王タイプ';
      avatarTheme = 'lightning';
      adviceAndPraise = 'なるべく「30秒リベンジマッチ」で即座に弱点を潰し、死角ゼロの絶対王者となるよう頑張ってみましょう。とはいえ、あなたの驚異的な反応速度と勝負勘はまさに百年に一人の逸材。その天才的な頭脳はすでに常人の領域をはるかに凌駕しています！';
    } else if (bonusSolved > 0) {
      styleDesc = '土壇場での極限の集中力と一撃必殺の勝負強さ';
      historicalFigure = '真田幸村（一発逆転の奇策将軍）';
      celebrity = '大谷翔平（世界を驚かす二刀流）';
      mbti = 'INTP-A';
      tag = '大舞台特化の一撃必殺スナイパー';
      avatarTheme = 'star';
      adviceAndPraise = 'なるべく日頃の基礎問題も軽視せず丁寧におさらいして、常に満点を叩き出せるよう頑張ってみましょう。しかしながら、ここぞという極限状態でのあなたの爆発的集中力と度胸は超一流。大舞台になればなるほど真価を発揮する真のヒーロー気質です！';
    } else if (avgSpeed >= 1.6 && accuracy >= 80) {
      styleDesc = '問題の罠を冷静に見極め、論理的に正解を射抜く慎重さ';
      historicalFigure = '諸葛亮孔明（深謀遠慮の名軍師）';
      celebrity = '林修 / 堺雅人';
      mbti = 'INTJ-A';
      tag = '冷徹無比の精密スナイパータイプ';
      avatarTheme = 'brain';
      adviceAndPraise = 'なるべく直感を信じてあと0.5秒早くタップする練習を重ね、スピードと精度の二刀流となるよう頑張ってみましょう。それにしても、複雑な構造を一瞬で見抜くあなたの分析眼と論理的思考力は圧巻のひと言。組織の知恵袋として誰もが頼りにする現代の天才軍師です！';
    } else if (avgSpeed < 1.5 && accuracy < 75) {
      styleDesc = '失敗を恐れず果敢に突き進む圧倒的な瞬発力とパッション';
      historicalFigure = '坂本龍馬（時代を切り拓く風雲児）';
      celebrity = '本田圭佑 / 出川哲朗';
      mbti = 'ESTP-T';
      tag = '猪突猛進のイノベータータイプ';
      avatarTheme = 'fire';
      adviceAndPraise = 'なるべく問題文のキーワードをしっかり捉えてから回答し、無駄なペナルティを回避できるよう頑張ってみましょう。ですが、この圧倒的な行動力と前に進むエネルギーこそが新しい時代を創る原動力。少しの知識補強だけで誰も追いつけないモンスターへ大化けします！';
    } else if (accuracy >= 70) {
      styleDesc = 'どんな状況でも崩れない安定感と高い情報処理能力';
      historicalFigure = '徳川家康（天下泰平の知将）';
      celebrity = 'タモリ / 芦田愛菜';
      mbti = 'ISTJ-A';
      tag = '堅忍不抜のマルチタスク型';
      avatarTheme = 'water';
      adviceAndPraise = 'なるべく苦手分野の「30秒リベンジ」を日課にして弱点を完全撲滅し、完全無欠のオールラウンダーとなるよう頑張ってみましょう。どんなジャンルも卒なく乗り越えるその底堅い知性と堅実な地頭は、将来どんな分野でもトップに君臨できる最高峰の才能です！';
    } else {
      styleDesc = '未知の問題にもひるまず立ち向かう旺盛な知的好奇心';
      historicalFigure = '豊臣秀吉（底知れぬ成長モンスター）';
      celebrity = '明石家さんま / 那須川天心';
      mbti = 'ENFP-T';
      tag = '無限進化のチャレンジャータイプ';
      avatarTheme = 'shadow';
      adviceAndPraise = 'なるべくミスした問題をその日のうちに克服して確実に自分の武器となるよう頑張ってみましょう。何よりあなたの吸収力とチャレンジ精神は底知れません。このクイズを毎日数回プレイするだけで、飛躍的な知性の覚醒が約束されています！';
    }

    // 復習の怠り度文言（弱点蓄積数またはミス直後の挙動に言及）
    let reviewSlacking = '';
    if (weakCount >= 3) {
      reviewSlacking = `弱点ノートに未克服問題が${weakCount}問残っており、復習もやや怠っているように見受けられます。`;
    } else if (weakCount > 0) {
      reviewSlacking = `ミスした問題の復習を少し後回しにしがちな傾向も見受けられます。`;
    } else {
      reviewSlacking = `やや油断して同じようなミスを繰り返してしまう瞬間も見受けられます。`;
    }

    // ユーザー指定の完全フォーマット文
    const evaluation = `${nameStr}さんは${styleDesc}で${topStr}が得意なようです。一方で${weakStr}は苦手なようで${reviewSlacking}${adviceAndPraise}\n\nそんなあなたは芸能人・プロスポーツ選手に例えると【${celebrity}】、歴史上の偉人に例えると【${historicalFigure}】です。`;

    return {
      historicalFigure,
      celebrity,
      mbti,
      tag,
      evaluation,
      avatarTheme,
      avgSpeed: typeof avgSpeed === 'number' ? avgSpeed.toFixed(2) : avgSpeed,
      accuracy: accuracy,
      score: score,
      topSubject: topStr,
      imagePrompt: `Cyberpunk futuristic anime avatar portrait, ${avatarTheme} elemental aura, smart sharp expression, neon holographic symbols, 8k badge design`
    };
  }

  // LLM API 連携呼び出し (Gemini / OpenAI形式両対応)
  async callLLMAPI(telemetry, settings) {
    const apiKey = settings.aiApiKey;
    let endpoint = settings.aiApiEndpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    const model = settings.aiModel || 'gemini-1.5-flash';

    const nameStr = telemetry.playerName || 'チャレンジャー';
    const weakCount = telemetry.weakCount || 0;

    const prompt = `あなたは超高速学習Webアプリ『SpeedQuiz』の専属AI診断士です。
プレイヤーのプレイログ（テレメトリデータ）を元に、ユーザーの性格と学習スタイルを分析し、ユーモアと説得力のある診断文を生成してください。

【厳格な文章テンプレート】
以下の文章構成を必ず守って「evaluation」を作成してください。
「${nameStr}さんは[回答スタイル・速度の特徴]で[得意科目]が得意なようです。一方で[苦手科目]は苦手なようで[復習を怠っている・後回しにしている様子の指摘]が見受けられます。なるべく[具体的な改善アドバイス]して[理想の姿]となるよう頑張ってみましょう。[多少大げさに褒めちぎってプレイヤーを最高に喜ばせるポジティブな総括]。\n\nそんなあなたは芸能人・プロスポーツ選手に例えると【[芸能人・スポーツ選手名]】、歴史上の偉人に例えると【[歴史上の人物名]】です。」

【テレメトリデータ】
- プレイヤー名: ${nameStr}
- 総合スコア: ${telemetry.score}点
- 正解率: ${telemetry.accuracy}%
- 平均解答速度: ${Number(telemetry.avgSpeed).toFixed(2)}秒
- 最大コンボ数: ${telemetry.maxCombo}
- ミス後の挙動: ${telemetry.postErrorReaction === 'rush' ? '焦って連打・誤タップ傾向' : 'フリーズして慎重に観察'}
- 得意科目: ${telemetry.topSubject || '算数・理科'}
- 苦手科目: ${telemetry.weakSubject || '社会・時事'}
- 未克服弱点問題の数: ${weakCount}問
- 難問ボーナス正解数: ${telemetry.bonusSolved}問

【出力フォーマット（JSON形式のみ出力してください。マークダウンの\`\`\`jsonブロックは不要です）】
{
  "historicalFigure": "歴史上の人物なら誰か（例：織田信長、諸葛亮孔明、坂本龍馬など）",
  "celebrity": "芸能人・プロスポーツ選手なら誰か（例：大谷翔平、イチロー、カズレーザーなど）",
  "mbti": "MBTI風4文字コード（例：ENTP-A, INTJ-A）",
  "tag": "二つ名キャッチコピー（例：神速の絶対覇王タイプ）",
  "evaluation": "上記の指定テンプレートに完全に従った診断文（250〜350文字程度）",
  "avatarTheme": "fire / lightning / water / brain / star / shadow のいずれか1つ",
  "imagePrompt": "アバター生成用英語プロンプト"
}`;

    const isOpenAI = endpoint.includes('/chat/completions') || endpoint.includes('api.openai.com');
    let rawText = '';

    if (isOpenAI) {
      // OpenAI / 互換API (Bearer token)
      const body = {
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful AI that only outputs pure JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      rawText = data.choices?.[0]?.message?.content || '';
    } else {
      // Google Gemini API
      // URLに指定モデルを反映
      if (model && !endpoint.includes(model) && endpoint.includes('googleapis.com')) {
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      }

      const url = endpoint.includes('?') ? `${endpoint}&key=${apiKey}` : `${endpoint}?key=${apiKey}`;

      const body = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (!rawText) throw new Error('Empty response from LLM API');

    // JSONパース（バッククォート等の除去）
    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return {
      ...parsed,
      avgSpeed: telemetry.avgSpeed.toFixed(2),
      accuracy: telemetry.accuracy,
      score: telemetry.score,
      topSubject: telemetry.topSubject || '全般'
    };
  }

  // アバター画像をCanvas上に生成してDataURLを返す
  drawAvatarBadge(canvas, diagnosis) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background gradient based on theme
    const bgGradients = {
      fire: ['#3a0ca3', '#f72585', '#ff4d6d'],
      lightning: ['#03071e', '#3f37c9', '#4cc9f0'],
      brain: ['#10002b', '#3c096c', '#9d4edd'],
      water: ['#03045e', '#0077b6', '#00b4d8'],
      star: ['#1b4332', '#2d6a4f', '#d8f3dc'],
      shadow: ['#212529', '#495057', '#6c757d']
    };

    const colors = bgGradients[diagnosis.avatarTheme] || bgGradients.lightning;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.6, colors[1]);
    grad.addColorStop(1, colors[2]);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative geometric cyber lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 40 + i * 25, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer Neon Glow Ring
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = colors[1];
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 100, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Central Icon / Emoji Avatar
    const themeIcons = {
      fire: '🔥',
      lightning: '⚡',
      brain: '🧠',
      water: '🌊',
      star: '🌟',
      shadow: '⚔️'
    };
    const icon = themeIcons[diagnosis.avatarTheme] || '⚡';

    ctx.save();
    ctx.font = '72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillText(icon, w / 2, h / 2 - 10);
    ctx.restore();

    // MBTI badge on bottom
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(w / 2 - 60, h / 2 + 55, 120, 28);
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w / 2 - 60, h / 2 + 55, 120, 28);

    ctx.fillStyle = '#00f5d4';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(diagnosis.mbti, w / 2, h / 2 + 69);
    ctx.restore();

    return canvas.toDataURL('image/png');
  }
}

export const diagnosisEngine = new DiagnosisEngine();
