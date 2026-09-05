/**
 * Main Application Controller (app.js)
 * Screen routing, UI binding, swipe gestures, result presentation, settings
 */

import { sound } from './audio.js';
import { fx } from './fx.js';
import { storage, ACHIEVEMENTS } from './storage.js';
import { dataLoader } from './data-loader.js';
import { QuizGame } from './quiz.js';
import { diagnosisEngine } from './diagnosis.js';

class SpeedQuizApp {
  constructor() {
    this.currentScreen = 'home';
    this.game = null;
    this.selectedMode = 'all';
    this.selectedSubjects = [];
    this.lastSessionResult = null;

    // Swipe tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
  }

  async init() {
    // Canvas初期化
    fx.init('crack-canvas', 'particle-canvas');

    // 問題データのロード
    const loaded = await dataLoader.load();
    if (!loaded) {
      alert('問題データの読み込みに失敗しました。');
      return;
    }

    // 初回タップでオーディオコンテキストをアンロック
    const unlockAudio = () => {
      sound.init();
      sound.ensureContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    // ゲームエンジン初期化
    this.initGameEngine();

    // UIイベントバインド
    this.bindEvents();

    // 初期データ描画
    this.updateHomeUI();
    this.updateDashboardUI();
    this.updateSettingsUI();
    this.updateRevengeBadge();

    // デフォルト画面表示
    this.showScreen('home');
  }

  initGameEngine() {
    this.game = new QuizGame({
      onTick: (remaining, total) => {
        const percent = (remaining / total) * 100;
        const timeBar = document.getElementById('game-time-bar');
        const timeText = document.getElementById('game-time-text');
        if (timeBar) timeBar.style.width = `${percent}%`;
        if (timeText) {
          timeText.textContent = remaining.toFixed(1);
          if (remaining <= 10.0) {
            timeText.classList.add('time-danger');
          } else {
            timeText.classList.remove('time-danger');
          }
        }
      },
      onQuestion: (question, isBonus) => {
        this.renderQuestion(question, isBonus);
      },
      onScoreUpdate: (newScore, added, combo) => {
        const scoreEl = document.getElementById('game-score-val');
        if (scoreEl) scoreEl.textContent = newScore.toLocaleString();

        this.showFloatingScore(`+${added}`);
      },
      onComboUpdate: (combo) => {
        const comboBadge = document.getElementById('game-combo-badge');
        if (!comboBadge) return;
        if (combo >= 3) {
          comboBadge.classList.remove('hidden');
          comboBadge.textContent = `${combo} COMBO!`;
          comboBadge.classList.add('pulse');
        } else {
          comboBadge.classList.add('hidden');
          comboBadge.classList.remove('pulse');
        }
      },
      onFeverChange: (isFever, msg) => {
        const feverBadge = document.getElementById('game-fever-badge');
        const gameScreen = document.getElementById('screen-game');
        if (feverBadge) {
          if (isFever) {
            feverBadge.classList.remove('hidden');
            feverBadge.classList.add('fever-active');
            gameScreen.classList.add('in-fever');
          } else {
            feverBadge.classList.add('hidden');
            feverBadge.classList.remove('fever-active');
            gameScreen.classList.remove('in-fever');
          }
        }
      },
      onWarning: () => {
        const warningEl = document.getElementById('game-warning-overlay');
        if (warningEl) {
          warningEl.classList.remove('hidden');
          warningEl.classList.add('warning-flash');
          setTimeout(() => {
            warningEl.classList.remove('warning-flash');
            warningEl.classList.add('hidden');
          }, 1800);
        }
      },
      onFreezeTick: (secondsLeft) => {
        const freezeOverlay = document.getElementById('game-freeze-overlay');
        const freezeSec = document.getElementById('freeze-seconds');
        const answerBtns = document.getElementById('game-answer-buttons');

        if (secondsLeft > 0) {
          freezeOverlay.classList.remove('hidden');
          if (freezeSec) freezeSec.textContent = secondsLeft.toFixed(1);
          if (answerBtns) answerBtns.classList.add('disabled');
        } else {
          freezeOverlay.classList.add('hidden');
          if (answerBtns) answerBtns.classList.remove('disabled');
        }
      },
      onFinish: (resultData) => {
        this.handleGameFinish(resultData);
      }
    });
  }

  showScreen(screenName) {
    this.currentScreen = screenName;
    document.querySelectorAll('.app-screen').forEach(el => {
      el.classList.remove('active');
    });
    const target = document.getElementById(`screen-${screenName}`);
    if (target) {
      target.classList.add('active');
      window.scrollTo(0, 0);
    }

    // ナビバーのアクティブ切り替え
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.screen === screenName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 画面ごとの更新
    if (screenName === 'home') {
      this.updateHomeUI();
      this.updateRevengeBadge();
    } else if (screenName === 'dashboard') {
      this.updateDashboardUI();
    } else if (screenName === 'revenge') {
      this.updateRevengeScreen();
    } else if (screenName === 'settings') {
      this.updateSettingsUI();
    }
  }

  bindEvents() {
    // ナビゲーション
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const screen = btn.dataset.screen;
        if (screen) {
          if (this.game && this.game.isActive) {
            if (!confirm('プレイを中止して画面を移動しますか？')) return;
            this.game.stop();
          }
          this.showScreen(screen);
        }
      });
    });

    // モード選択ボタン
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMode = card.dataset.mode;
      });
    });

    // スマート設定プリセットボタン
    document.querySelectorAll('.smart-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const preset = btn.dataset.preset;
        this.applySmartPreset(preset);
      });
    });

    // スタートボタン
    const startBtn = document.getElementById('home-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        sound.playClick();
        this.startNewGame(false);
      });
    }

    // ゲーム中の回答ボタン（❌ NO & ⭕ YES）
    const btnNo = document.getElementById('btn-answer-no');
    const btnYes = document.getElementById('btn-answer-yes');
    if (btnNo) {
      btnNo.addEventListener('click', () => {
        this.handleUserAnswer(false);
      });
    }
    if (btnYes) {
      btnYes.addEventListener('click', () => {
        this.handleUserAnswer(true);
      });
    }

    // スワイプジェスチャー（タッチ操作）
    const cardEl = document.getElementById('game-card-container');
    if (cardEl) {
      cardEl.addEventListener('touchstart', (e) => {
        if (!this.game || !this.game.isActive || this.game.isFrozen) return;
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = performance.now();
      }, { passive: true });

      cardEl.addEventListener('touchend', (e) => {
        if (!this.game || !this.game.isActive || this.game.isFrozen) return;
        const touch = e.changedTouches[0];
        const diffX = touch.clientX - this.touchStartX;
        const diffY = touch.clientY - this.touchStartY;
        const duration = performance.now() - this.touchStartTime;

        // 水平スワイプ判定: 50px以上、縦ブレが小さく、300ms以内
        if (Math.abs(diffX) > 50 && Math.abs(diffY) < 70 && duration < 400) {
          if (diffX > 0) {
            // 右スワイプ = YES
            this.animateCardSwipe('right', () => this.handleUserAnswer(true));
          } else {
            // 左スワイプ = NO
            this.animateCardSwipe('left', () => this.handleUserAnswer(false));
          }
        }
      }, { passive: true });
    }

    // リザルト画面のボタン
    const resultRetryBtn = document.getElementById('result-retry-btn');
    if (resultRetryBtn) {
      resultRetryBtn.addEventListener('click', () => {
        sound.playClick();
        this.startNewGame(false);
      });
    }
    const resultRevengeBtn = document.getElementById('result-revenge-btn');
    if (resultRevengeBtn) {
      resultRevengeBtn.addEventListener('click', () => {
        sound.playClick();
        this.startNewGame(true);
      });
    }
    const resultHomeBtn = document.getElementById('result-home-btn');
    if (resultHomeBtn) {
      resultHomeBtn.addEventListener('click', () => {
        sound.playClick();
        this.showScreen('home');
      });
    }

    // SNSシェアボタン
    const shareBtn = document.getElementById('result-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareResult());
    }

    // アバター保存ボタン
    const saveAvatarBtn = document.getElementById('result-save-avatar-btn');
    if (saveAvatarBtn) {
      saveAvatarBtn.addEventListener('click', () => this.downloadAvatar());
    }

    // 復習マッチ開始ボタン（復習画面より）
    const revengeMatchBtn = document.getElementById('revenge-start-match-btn');
    if (revengeMatchBtn) {
      revengeMatchBtn.addEventListener('click', () => {
        sound.playClick();
        this.startNewGame(true);
      });
    }

    // プレイヤー名保存
    const saveNameBtn = document.getElementById('profile-save-name-btn');
    if (saveNameBtn) {
      saveNameBtn.addEventListener('click', () => {
        sound.playClick();
        const input = document.getElementById('profile-name-input');
        if (input && input.value.trim()) {
          storage.updatePlayer(input.value.trim());
          this.updateHomeUI();
          this.updateDashboardUI();
          alert('プレイヤー名を更新しました！');
        }
      });
    }

    // 設定画面の保存
    const saveSettingsBtn = document.getElementById('settings-save-btn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        sound.playClick();
        const endpoint = document.getElementById('settings-ai-endpoint').value.trim();
        const apiKey = document.getElementById('settings-ai-key').value.trim();
        const soundOn = document.getElementById('settings-sound-toggle').checked;
        const bgmOn = document.getElementById('settings-bgm-toggle').checked;

        storage.updateSettings({
          aiApiEndpoint: endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
          aiApiKey: apiKey,
          soundEnabled: soundOn,
          bgmEnabled: bgmOn
        });

        sound.setMuted(!soundOn);
        alert('設定を保存しました！');
      });
    }

    // データリセット
    const resetDataBtn = document.getElementById('settings-reset-btn');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('本当にすべての学習記録・アチーブメントを削除して初期化しますか？この操作は取り消せません。')) {
          storage.clearAllData();
          this.updateHomeUI();
          this.updateDashboardUI();
          this.updateSettingsUI();
          alert('すべてのデータを初期化しました。');
        }
      });
    }

    // 成績ダウンロード
    const dlCsvBtn = document.getElementById('settings-dl-csv');
    if (dlCsvBtn) {
      dlCsvBtn.addEventListener('click', () => {
        sound.playClick();
        this.downloadFile('speedquiz_stats.csv', storage.exportDataAsCSV(), 'text/csv');
      });
    }
    const dlJsonBtn = document.getElementById('settings-dl-json');
    if (dlJsonBtn) {
      dlJsonBtn.addEventListener('click', () => {
        sound.playClick();
        this.downloadFile('speedquiz_stats.json', storage.exportDataAsJSON(), 'application/json');
      });
    }
  }

  applySmartPreset(preset) {
    const checkMap = {
      'bunkei': ['国語', '英語', '社会', '政治', '経済', '歴史', '地理'],
      'rikei': ['算数・数学', '理科', '英語', 'IT'],
      'kokuritsu': ['国語', '算数・数学', '英語', '理科', '社会', 'IT'],
      'business': ['政治', '経済', 'IT', '一般教養'],
      'all': ['算数・数学', '理科', '社会', '国語', '英語', '政治', '経済', '地理', '歴史', 'IT']
    };

    const targetList = checkMap[preset] || checkMap['all'];

    document.querySelectorAll('.subject-checkbox').forEach(cb => {
      cb.checked = targetList.some(item => cb.value.includes(item) || item.includes(cb.value));
    });
  }

  getSelectedSubjects() {
    const list = [];
    document.querySelectorAll('.subject-checkbox:checked').forEach(cb => {
      list.push(cb.value);
    });
    return list;
  }

  startNewGame(isRevenge = false) {
    if (isRevenge) {
      const pending = storage.getPendingWeaknesses();
      if (pending.length === 0) {
        alert('現在未克服の弱点問題はありません！素晴らしい！');
        return;
      }
    }

    this.selectedSubjects = this.getSelectedSubjects();
    this.showScreen('game');

    // UIリセット
    const scoreEl = document.getElementById('game-score-val');
    if (scoreEl) scoreEl.textContent = '0';
    const comboBadge = document.getElementById('game-combo-badge');
    if (comboBadge) comboBadge.classList.add('hidden');
    const feverBadge = document.getElementById('game-fever-badge');
    if (feverBadge) feverBadge.classList.add('hidden');
    const freezeOverlay = document.getElementById('game-freeze-overlay');
    if (freezeOverlay) freezeOverlay.classList.add('hidden');
    const answerBtns = document.getElementById('game-answer-buttons');
    if (answerBtns) answerBtns.classList.remove('disabled');

    // ゲーム開始
    this.game.start(this.selectedMode, this.selectedSubjects, isRevenge);
  }

  handleUserAnswer(boolVal) {
    if (!this.game || !this.game.isActive || this.game.isFrozen) return;

    // ボタンのタップアニメーション
    const btn = boolVal ? document.getElementById('btn-answer-yes') : document.getElementById('btn-answer-no');
    if (btn) {
      btn.classList.add('active-tap');
      setTimeout(() => btn.classList.remove('active-tap'), 150);
    }

    this.game.submitAnswer(boolVal);
  }

  animateCardSwipe(direction, callback) {
    const card = document.getElementById('game-card-container');
    if (!card) {
      callback();
      return;
    }
    const animClass = direction === 'right' ? 'swipe-right' : 'swipe-left';
    card.classList.add(animClass);
    setTimeout(() => {
      card.classList.remove(animClass);
      callback();
    }, 150);
  }

  renderQuestion(question, isBonus) {
    const catEl = document.getElementById('game-q-category');
    const sourceEl = document.getElementById('game-q-source');
    const textEl = document.getElementById('game-q-text');
    const cardEl = document.getElementById('game-card-container');

    if (catEl) catEl.textContent = `${question.category} > ${question.subcategory}`;
    if (sourceEl) {
      if (question.source) {
        sourceEl.textContent = `出題: ${question.source}`;
        sourceEl.classList.remove('hidden');
      } else {
        sourceEl.classList.add('hidden');
      }
    }
    if (textEl) textEl.textContent = question.question;

    if (cardEl) {
      if (isBonus) {
        cardEl.classList.add('bonus-card');
      } else {
        cardEl.classList.remove('bonus-card');
      }
    }
  }

  showFloatingScore(text) {
    const floatEl = document.createElement('div');
    floatEl.className = 'floating-score';
    floatEl.textContent = text;
    const container = document.getElementById('game-floating-container');
    if (container) {
      container.appendChild(floatEl);
      setTimeout(() => floatEl.remove(), 700);
    }
  }

  async handleGameFinish(resultData) {
    this.lastSessionResult = resultData;
    this.showScreen('result');

    // Block 1: スコア＆統計＆アチーブメント
    this.renderResultBlock1(resultData);

    // Block 2: AIパーソナリティ診断＆アバター
    await this.renderResultBlock2(resultData.telemetry);

    // Block 3: 30秒リベンジデッキ
    this.renderResultBlock3();

    // Block 4: 深掘りショートリンク
    this.renderResultBlock4();

    this.updateRevengeBadge();
  }

  renderResultBlock1(resultData) {
    const { score, telemetry, newAchievements } = resultData;

    document.getElementById('result-score-val').textContent = score.toLocaleString();

    // ランク格付け
    let rank = 'C';
    let rankColor = '#6c757d';
    if (score >= 12000) { rank = 'SSS'; rankColor = '#ffd700'; }
    else if (score >= 9000) { rank = 'SS'; rankColor = '#ff007f'; }
    else if (score >= 6000) { rank = 'S'; rankColor = '#00f5d4'; }
    else if (score >= 4000) { rank = 'A'; rankColor = '#00bbf9'; }
    else if (score >= 2000) { rank = 'B'; rankColor = '#7b2cbf'; }

    const rankEl = document.getElementById('result-rank-badge');
    if (rankEl) {
      rankEl.textContent = rank;
      rankEl.style.color = rankColor;
    }

    document.getElementById('result-stat-answered').textContent = telemetry.totalAnswered;
    document.getElementById('result-stat-correct').textContent = telemetry.totalCorrect;
    document.getElementById('result-stat-accuracy').textContent = `${telemetry.accuracy}%`;
    document.getElementById('result-stat-speed').textContent = `${telemetry.avgSpeed.toFixed(2)}s`;
    document.getElementById('result-stat-combo').textContent = telemetry.maxCombo;

    // 新規解除アチーブメント
    const achContainer = document.getElementById('result-achievements-container');
    if (achContainer) {
      achContainer.innerHTML = '';
      if (newAchievements && newAchievements.length > 0) {
        achContainer.classList.remove('hidden');
        newAchievements.forEach(ach => {
          const item = document.createElement('div');
          item.className = 'achievement-unlocked-card';
          item.innerHTML = `
            <div class="ach-icon">🏆</div>
            <div class="ach-info">
              <div class="ach-title">称号獲得: <strong>${ach.titleReward}</strong></div>
              <div class="ach-desc">${ach.title} — ${ach.desc}</div>
            </div>
          `;
          achContainer.appendChild(item);
        });
        fx.triggerConfetti(50);
      } else {
        achContainer.classList.add('hidden');
      }
    }
  }

  async renderResultBlock2(telemetry) {
    const settings = storage.getSettings();
    const loadingEl = document.getElementById('diagnosis-loading');
    const contentEl = document.getElementById('diagnosis-content');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (contentEl) contentEl.classList.add('hidden');

    const diagnosis = await diagnosisEngine.generateDiagnosis(telemetry, settings);
    storage.saveDiagnosis(diagnosis);

    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

    document.getElementById('diag-tag').textContent = diagnosis.tag;
    document.getElementById('diag-historical').textContent = diagnosis.historicalFigure;
    document.getElementById('diag-celebrity').textContent = diagnosis.celebrity;
    document.getElementById('diag-mbti').textContent = diagnosis.mbti;
    document.getElementById('diag-evaluation').textContent = diagnosis.evaluation;

    // アバター描画
    const canvas = document.getElementById('diag-avatar-canvas');
    if (canvas) {
      diagnosisEngine.drawAvatarBadge(canvas, diagnosis);
    }
  }

  renderResultBlock3() {
    const revengeBlock = document.getElementById('result-block-revenge');
    const listEl = document.getElementById('result-missed-list');
    const weaknesses = storage.getPendingWeaknesses();

    if (weaknesses.length === 0) {
      if (revengeBlock) revengeBlock.classList.add('hidden');
      return;
    }

    if (revengeBlock) revengeBlock.classList.remove('hidden');
    if (listEl) {
      listEl.innerHTML = '';
      // 直近のミス問を最大5問表示
      const recent = weaknesses.slice(0, 5);
      recent.forEach(w => {
        const card = document.createElement('div');
        card.className = 'weakness-card';
        card.innerHTML = `
          <div class="w-header">
            <span class="w-cat">${w.category} > ${w.subcategory}</span>
            <span class="w-ans">正解: <strong>${w.answer}</strong></span>
          </div>
          <div class="w-q">${w.question}</div>
          <div class="w-exp">💡 ${w.explanation}</div>
        `;
        listEl.appendChild(card);
      });
    }
  }

  renderResultBlock4() {
    const linkList = document.getElementById('result-deep-links');
    if (!linkList) return;
    linkList.innerHTML = '';

    const pending = storage.getPendingWeaknesses();
    const topics = [];

    if (pending.length > 0) {
      pending.slice(0, 2).forEach(w => {
        topics.push({
          title: `「${w.subcategory || w.category}」の要点解説`,
          query: `${w.subcategory} ${w.category} わかりやすく 解説`
        });
      });
    } else {
      topics.push({
        title: '共通テスト頻出！重要公式・要点まとめ動画',
        query: '共通テスト 勉強法 超高速復習'
      });
    }

    topics.forEach(t => {
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(t.query)}`;
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(t.query)}`;

      const a = document.createElement('div');
      a.className = 'deep-link-item';
      a.innerHTML = `
        <div class="link-title">${t.title}</div>
        <div class="link-actions">
          <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="link-btn yt-btn">📺 YouTubeで見る</a>
          <a href="${googleUrl}" target="_blank" rel="noopener noreferrer" class="link-btn search-btn">🔍 Google検索</a>
        </div>
      `;
      linkList.appendChild(a);
    });
  }

  shareResult() {
    if (!this.lastSessionResult) return;
    const score = this.lastSessionResult.score;
    const acc = this.lastSessionResult.telemetry.accuracy;
    const shareText = `【SpeedQuiz】60秒タイムアタックで${score.toLocaleString()}点を獲得！（正解率: ${acc}%） #SpeedQuiz #神速学習`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: 'SpeedQuiz リザルト',
        text: shareText,
        url: shareUrl
      }).catch(() => {});
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, '_blank');
    }
  }

  downloadAvatar() {
    const canvas = document.getElementById('diag-avatar-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'speedquiz-avatar.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  updateHomeUI() {
    const player = storage.getPlayer();
    const stats = storage.getStats();

    const nameEl = document.getElementById('home-player-name');
    const titleEl = document.getElementById('home-player-title');
    const scoreEl = document.getElementById('home-high-score');
    const trophiesEl = document.getElementById('home-trophy-count');

    if (nameEl) nameEl.textContent = player.name;
    if (titleEl) titleEl.textContent = `《${player.currentTitle}》`;
    if (scoreEl) scoreEl.textContent = stats.highScore.toLocaleString();
    if (trophiesEl) trophiesEl.textContent = `${storage.getUnlockedAchievementsCount()}/${ACHIEVEMENTS.length}`;
  }

  updateRevengeBadge() {
    const pending = storage.getPendingWeaknesses();
    const badges = document.querySelectorAll('.revenge-badge');
    badges.forEach(b => {
      b.textContent = pending.length;
      if (pending.length > 0) {
        b.classList.remove('hidden');
      } else {
        b.classList.add('hidden');
      }
    });
  }

  updateRevengeScreen() {
    const listEl = document.getElementById('revenge-screen-list');
    const countEl = document.getElementById('revenge-count-total');
    const weaknesses = storage.getAllWeaknesses();

    if (countEl) countEl.textContent = storage.getPendingWeaknesses().length;

    if (!listEl) return;
    listEl.innerHTML = '';

    if (weaknesses.length === 0) {
      listEl.innerHTML = '<div class="empty-msg">現在、間違えた弱点問題はありません！</div>';
      return;
    }

    weaknesses.forEach(w => {
      const card = document.createElement('div');
      card.className = `weakness-card ${w.overcome ? 'overcome' : ''}`;
      card.innerHTML = `
        <div class="w-header">
          <span class="w-cat">${w.category} > ${w.subcategory}</span>
          <span class="w-status">${w.overcome ? '✅ 克服完了' : '⚠️ 未克服'}</span>
        </div>
        <div class="w-q">${w.question}</div>
        <div class="w-ans">正解: <strong>${w.answer}</strong> (ミス回数: ${w.missCount || 1}回)</div>
        <div class="w-exp">💡 ${w.explanation}</div>
      `;
      listEl.appendChild(card);
    });
  }

  updateDashboardUI() {
    const player = storage.getPlayer();
    const stats = storage.getStats();

    // プレイヤー名インプット
    const nameInput = document.getElementById('profile-name-input');
    if (nameInput) nameInput.value = player.name;

    // 称号選択セレクトボックス
    const titleSelect = document.getElementById('profile-title-select');
    if (titleSelect) {
      titleSelect.innerHTML = '';
      player.equippedTitles.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (t === player.currentTitle) opt.selected = true;
        titleSelect.appendChild(opt);
      });
      titleSelect.onchange = () => {
        storage.updatePlayer(null, titleSelect.value);
        this.updateHomeUI();
      };
    }

    // スタッツ
    document.getElementById('dash-total-score').textContent = stats.totalScore.toLocaleString();
    document.getElementById('dash-high-score').textContent = stats.highScore.toLocaleString();
    document.getElementById('dash-total-plays').textContent = stats.totalPlays;
    document.getElementById('dash-total-correct').textContent = stats.totalCorrect;
    const overallAcc = stats.totalQuestionsAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalQuestionsAnswered) * 100)
      : 0;
    document.getElementById('dash-overall-acc').textContent = `${overallAcc}%`;

    // 科目別マスター進捗（仕様書の進捗機能）
    const progContainer = document.getElementById('dash-category-progress');
    if (progContainer) {
      progContainer.innerHTML = '';
      const allQ = dataLoader.getAllQuestions();
      const progressList = storage.getCategoryProgressList(allQ);

      progressList.forEach(p => {
        const item = document.createElement('div');
        item.className = 'prog-item';
        item.innerHTML = `
          <div class="prog-label">
            <span>${p.categoryKey}</span>
            <span>${p.correct} / ${p.total} (${p.percent}%)</span>
          </div>
          <div class="prog-bar-bg">
            <div class="prog-bar-fill" style="width: ${p.percent}%"></div>
          </div>
        `;
        progContainer.appendChild(item);
      });
    }

    // アチーブメント一覧
    const achListEl = document.getElementById('dash-achievements-list');
    if (achListEl) {
      achListEl.innerHTML = '';
      ACHIEVEMENTS.forEach(a => {
        const unlocked = storage.isAchievementUnlocked(a.id);
        const card = document.createElement('div');
        card.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
          <div class="ach-badge-icon">${unlocked ? '🏆' : '🔒'}</div>
          <div class="ach-badge-info">
            <div class="ach-badge-title">${a.title} <span class="ach-reward-tag">《${a.titleReward}》</span></div>
            <div class="ach-badge-desc">${a.desc}</div>
          </div>
        `;
        achListEl.appendChild(card);
      });
    }
  }

  updateSettingsUI() {
    const s = storage.getSettings();
    const endpointInput = document.getElementById('settings-ai-endpoint');
    const keyInput = document.getElementById('settings-ai-key');
    const soundToggle = document.getElementById('settings-sound-toggle');
    const bgmToggle = document.getElementById('settings-bgm-toggle');

    if (endpointInput) endpointInput.value = s.aiApiEndpoint || '';
    if (keyInput) keyInput.value = s.aiApiKey || '';
    if (soundToggle) soundToggle.checked = s.soundEnabled !== false;
    if (bgmToggle) bgmToggle.checked = s.bgmEnabled !== false;
  }

  downloadFile(fileName, content, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// アプリ起動
window.addEventListener('DOMContentLoaded', () => {
  window.app = new SpeedQuizApp();
  window.app.init();
});
