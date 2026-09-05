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

  // ビルトイン診断ロジック（速度、正解率、ミス後反応、得意ジャンルから判定）
  generateHeuristicDiagnosis(telemetry) {
    const { avgSpeed, accuracy, postErrorReaction, topSubject, score, maxCombo, bonusSolved } = telemetry;

    let character = '';
    let historicalFigure = '';
    let celebrity = '';
    let mbti = '';
    let tag = '';
    let evaluation = '';
    let avatarTheme = 'fire'; // fire, lightning, water, brain, star, shadow

    // タイプ分類ロジック
    if (avgSpeed < 1.2 && accuracy >= 85) {
      // 超高速 ＆ 高精度
      historicalFigure = '織田信長（電光石火の革新者）';
      celebrity = 'イチロー / カズレーザー';
      mbti = 'ENTJ-A';
      tag = '神速の絶対覇王タイプ';
      avatarTheme = 'lightning';
      evaluation = `圧倒的な反射速度（平均${avgSpeed.toFixed(2)}秒）と驚異の正解率（${accuracy}%）を両立する超天才肌。迷わず直感で即断即決し、しかも的を射ている姿はまさに天下統一を急いだ信長そのもの。弱点科目すら直感でねじ伏せる圧倒的ポテンシャルを持っています。`;
    } else if (avgSpeed < 1.4 && accuracy < 70) {
      // 超高速 だが 粗い（直感突撃型）
      historicalFigure = '坂本龍馬（時代の突撃突破者）';
      celebrity = '出川哲朗 / 本田圭佑';
      mbti = 'ESTP-T';
      tag = '猪突猛進のイノベータータイプ';
      avatarTheme = 'fire';
      evaluation = `思い立ったら0.1秒で突っ走る圧倒的な瞬発力の持ち主！${postErrorReaction === 'rush' ? 'ミス直後も焦って連打してしまうパッション全開な傾向あり。' : ''}細かなミスは気にせず手数を打って前進するバイタリティは最強です。あと1秒落ち着くだけでスコアは倍増します。`;
    } else if (avgSpeed >= 1.8 && accuracy >= 85) {
      // 慎重 ＆ 高精度（参謀・学者型）
      historicalFigure = '諸葛亮孔明（深謀遠慮の名軍師）';
      celebrity = '林修 / 堺雅人';
      mbti = 'INTJ-A';
      tag = '冷徹無比の精密スナイパータイプ';
      avatarTheme = 'brain';
      evaluation = `問題の構造を瞬時に見抜き、罠に絶対ハマらない慎重派の極み。平均${avgSpeed.toFixed(2)}秒の堅実なテンポで確実に正解を積み上げ、正解率${accuracy}%を記録。${topSubject ? `特に「${topSubject}」での安定感は芸術的。` : ''}冷静沈着な軍師として組織を勝たせる頭脳派です。`;
    } else if (bonusSolved > 0) {
      // 難問を仕留めた一発逆転型
      historicalFigure = '真田幸村（一発逆転の奇策将軍）';
      celebrity = '大谷翔平 / 羽生善治';
      mbti = 'INTP-A';
      tag = '大舞台特化の一撃必殺スナイパー';
      avatarTheme = 'star';
      evaluation = `通常問題ではやや波があるものの、ここぞという極限の難問カットインで劇的な正解を叩き出す勝負強さの持ち主！ピンチになればなるほど脳のギアが上がる逆境特化型です。`;
    } else if (accuracy >= 70) {
      // バランス型
      historicalFigure = '徳川家康（堅実安定の大器晩成型）';
      celebrity = 'タモリ / 芦田愛菜';
      mbti = 'ISTJ-A';
      tag = '堅忍不抜のマルチタスク型';
      avatarTheme = 'water';
      evaluation = `どんなジャンルでも卒なく7割以上の成果を出す手堅い秀才タイプ。ミスした直後も冷静に立ち直り、着実にスコアを伸ばす安定感があります。少しスピードを意識すれば一気にトップランカーへと覚醒します。`;
    } else {
      // 成長途上・挑戦者
      historicalFigure = '豊臣秀吉（底知れぬ成長モンスター）';
      celebrity = '明石家さんま';
      mbti = 'ENFP-T';
      tag = '無限進化のチャレンジャータイプ';
      avatarTheme = 'shadow';
      evaluation = `好奇心旺盛で果敢にクイズに飛び込むフットワークが素晴らしい！今はまだ知識のインプット途上ですが、30秒リベンジデッキを回すことで急激に化ける爆発力を秘めています。`;
    }

    return {
      historicalFigure,
      celebrity,
      mbti,
      tag,
      evaluation,
      avatarTheme,
      avgSpeed: avgSpeed.toFixed(2),
      accuracy: accuracy,
      score: score,
      topSubject: topSubject || '全般',
      imagePrompt: `Cyberpunk futuristic anime avatar portrait, ${avatarTheme} elemental aura, smart sharp expression, neon holographic symbols, 8k badge design`
    };
  }

  // LLM API 連携呼び出し (Gemini / OpenAI形式両対応)
  async callLLMAPI(telemetry, settings) {
    const apiKey = settings.aiApiKey;
    let endpoint = settings.aiApiEndpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    const model = settings.aiModel || 'gemini-1.5-flash';

    const prompt = `あなたは超高速学習Webアプリ『SpeedQuiz』の専属AI診断士です。
プレイヤーのプレイログ（テレメトリデータ）を元に、ユーザーの性格と学習スタイルを鋭く分析し、ユーモアと知的興奮のある診断結果を日本語JSON形式で返してください。

【テレメトリデータ】
- 総合スコア: ${telemetry.score}点
- 正解率: ${telemetry.accuracy}%
- 平均解答速度: ${telemetry.avgSpeed.toFixed(2)}秒
- 最大コンボ数: ${telemetry.maxCombo}
- ミス後の挙動: ${telemetry.postErrorReaction === 'rush' ? '焦って連打・誤タップ傾向' : 'フリーズして慎重に観察'}
- 得意科目: ${telemetry.topSubject || 'なし'}
- 苦手科目: ${telemetry.weakSubject || 'なし'}
- 難問ボーナス正解数: ${telemetry.bonusSolved}問

【出力フォーマット（JSON形式のみ出力してください。マークダウンの\`\`\`jsonブロックは不要です）】
{
  "historicalFigure": "歴史上の人物なら誰か（例：織田信長、諸葛亮孔明など）",
  "celebrity": "芸能人・有名人なら誰か",
  "mbti": "MBTI風4文字コード（例：ENTP-A）",
  "tag": "二つ名キャッチコピー（例：電光石火の直感スナイパー）",
  "evaluation": "刺さる性格評と学習アドバイス（150字程度）",
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
