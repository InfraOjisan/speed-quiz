/**
 * AI Service (ai-service.js)
 * Unified adapter for OpenAI-compatible APIs (OpenRouter, OpenAI, Groq, Ollama, DeepSeek)
 * and Google Gemini API.
 * Handles endpoint auto-normalization, connection testing, and robust error handling.
 */

export class AIService {
  /**
   * エンドポイントURL、モデル、APIキーを自動解析して正規化
   * @param {string} endpoint 
   * @param {string} model 
   * @param {string} apiKey 
   */
  static resolveConfig(endpoint = '', model = '', apiKey = '') {
    endpoint = (endpoint || '').trim();
    model = (model || '').trim();
    apiKey = (apiKey || '').trim();

    // Google Gemini判定: URLに googleapis.com が含まれるか、モデル名が gemini- で始まりエンドポイント未指定の場合
    const isGemini = endpoint.includes('googleapis.com') || (!endpoint && model.toLowerCase().startsWith('gemini'));

    if (isGemini) {
      let targetModel = model || 'gemini-1.5-flash';
      let cleanEndpoint = endpoint;
      if (!cleanEndpoint || !cleanEndpoint.includes('googleapis.com')) {
        cleanEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;
      } else if (model && !cleanEndpoint.includes(model)) {
        cleanEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      }
      return {
        type: 'gemini',
        url: cleanEndpoint,
        model: targetModel,
        apiKey
      };
    }

    // OpenAI 互換 (OpenRouter, OpenAI, Groq, Ollama, DeepSeek, Local proxy等)
    let url = endpoint || 'https://openrouter.ai/api/v1';
    url = url.replace(/\/+$/, ''); // 末尾のスラッシュを削除

    // /chat/completions が末尾についていない場合は自動付加
    if (!url.endsWith('/chat/completions')) {
      url = `${url}/chat/completions`;
    }

    let defaultModel = 'gpt-4o-mini';
    if (url.includes('openrouter.ai')) {
      defaultModel = model || 'openai/gpt-4o-mini';
    } else {
      defaultModel = model || 'gpt-4o-mini';
    }

    return {
      type: 'openai',
      url,
      model: defaultModel,
      apiKey
    };
  }

  /**
   * AI API への接続テストを実行
   * @param {Object} settings { aiApiEndpoint, aiModel, aiApiKey }
   * @returns {Promise<{ success: boolean, message: string, latencyMs?: number }>}
   */
  static async testConnection(settings = {}) {
    const config = this.resolveConfig(settings.aiApiEndpoint, settings.aiModel, settings.aiApiKey);

    if (!config.apiKey) {
      return {
        success: false,
        message: 'APIキーが入力されていません。設定画面でAPIキーを入力してください。'
      };
    }

    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

    try {
      if (config.type === 'gemini') {
        const url = config.url.includes('?') 
          ? `${config.url}&key=${config.apiKey}` 
          : `${config.url}?key=${config.apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with the exact word "OK".' }] }],
            generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
          })
        });

        clearTimeout(timeoutId);
        const latencyMs = Math.round(performance.now() - startTime);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || res.statusText;
          return {
            success: false,
            message: this.formatErrorMessage(res.status, errMsg, config)
          };
        }

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';

        return {
          success: true,
          message: `接続成功！ [Google Gemini: ${config.model}] から正常に応答を受信しました (応答: "${reply}", 応答時間: ${latencyMs}ms)`,
          latencyMs
        };
      } else {
        // OpenAI 互換
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        };

        // OpenRouter用ヘッダー
        if (config.url.includes('openrouter.ai')) {
          headers['HTTP-Referer'] = 'https://infraojisan.github.io/speed-quiz/';
          headers['X-Title'] = 'SpeedQuiz';
        }

        const res = await fetch(config.url, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: 'Respond with the exact word "OK".' }],
            max_tokens: 10,
            temperature: 0.1
          })
        });

        clearTimeout(timeoutId);
        const latencyMs = Math.round(performance.now() - startTime);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || errData.message || res.statusText;
          return {
            success: false,
            message: this.formatErrorMessage(res.status, errMsg, config)
          };
        }

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || 'OK';

        const providerLabel = config.url.includes('openrouter.ai') 
          ? 'OpenRouter' 
          : config.url.includes('api.openai.com') 
            ? 'OpenAI' 
            : 'OpenAI互換API';

        return {
          success: true,
          message: `接続成功！ [${providerLabel}: ${config.model}] から正常に応答を受信しました (応答: "${reply}", 応答時間: ${latencyMs}ms)`,
          latencyMs
        };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: '接続タイムアウト: サーバーからの応答が10秒以内にありませんでした。エンドポイントURLをご確認ください。'
        };
      }
      return {
        success: false,
        message: `通信エラー: ${err.message || 'ネットワーク障害またはCORS制限が発生しました。'}`
      };
    }
  }

  /**
   * チャット完了プロンプトを送信
   * @param {string} prompt 
   * @param {string} systemPrompt 
   * @param {Object} settings 
   * @param {number} maxTokens 
   * @returns {Promise<string>} 生成されたテキスト
   */
  static async callChatCompletion(prompt, systemPrompt = '', settings = {}, maxTokens = 1200) {
    const config = this.resolveConfig(settings.aiApiEndpoint, settings.aiModel, settings.aiApiKey);

    if (!config.apiKey) {
      throw new Error('APIキーが設定されていません。');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒タイムアウト

    try {
      if (config.type === 'gemini') {
        const url = config.url.includes('?') 
          ? `${config.url}&key=${config.apiKey}` 
          : `${config.url}?key=${config.apiKey}`;

        const bodyPayload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: maxTokens
          }
        };

        if (systemPrompt) {
          bodyPayload.systemInstruction = {
            parts: [{ text: systemPrompt }]
          };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(bodyPayload)
        });

        clearTimeout(timeoutId);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(this.formatErrorMessage(res.status, errData.error?.message, config));
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini APIから空の応答を受信しました。');
        return text;
      } else {
        // OpenAI 互換 (OpenRouter含む)
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        };

        if (config.url.includes('openrouter.ai')) {
          headers['HTTP-Referer'] = 'https://infraojisan.github.io/speed-quiz/';
          headers['X-Title'] = 'SpeedQuiz';
        }

        const messages = [];
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const res = await fetch(config.url, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: 0.7,
            max_tokens: maxTokens
          })
        });

        clearTimeout(timeoutId);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || errData.message;
          throw new Error(this.formatErrorMessage(res.status, errMsg, config));
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('AI APIから空の応答を受信しました。');
        return text;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * HTTPステータスに応じた親切なエラーメッセージ整形
   */
  static formatErrorMessage(status, rawMessage, config) {
    if (status === 401) {
      return `認証エラー (401): APIキーが無効か、認証権限がありません。入力したAPIキーをご確認ください。`;
    }
    if (status === 403) {
      return `アクセス拒否 (403): APIのアクセス権限不足またはクレジット残高不足の可能性があります。アカウントの利用上限をご確認ください。`;
    }
    if (status === 404) {
      return `URLまたはモデル未検出 (404): エンドポイントURL「${config.url}」またはモデル名「${config.model}」が存在しないか誤っています。`;
    }
    if (status === 429) {
      return `利用制限 (429): APIのレートリミットまたは利用枠を超過しました。しばらく時間を置いてから再度お試しください。`;
    }
    return `APIエラー (${status}): ${rawMessage || 'サーバーエラーが発生しました。'}`;
  }
}
