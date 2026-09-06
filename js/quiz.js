/**
 * Core Quiz Engine (quiz.js)
 * High-speed 60s time attack, combo/fever mechanics, hard bonus cut-in,
 * swipe gesture detection, freeze penalties, telemetry collection.
 */

import { sound } from './audio.js';
import { fx } from './fx.js';
import { storage } from './storage.js';
import { dataLoader } from './data-loader.js';

export class QuizGame {
  constructor(callbacks) {
    this.cb = callbacks; // { onTick, onQuestion, onScoreUpdate, onComboUpdate, onFeverChange, onWarning, onFinish, onFreezeTick }
    this.isActive = false;
    this.isFrozen = false;
    this.isRevengeMode = false;

    this.timer = null;
    this.timeRemaining = 60.0;
    this.totalTime = 60.0;
    this.score = 0;
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.isFever = false;

    this.questionQueue = [];
    this.currentIndex = 0;
    this.currentQuestion = null;
    this.questionStartTime = 0;

    // ボーナス問題制御
    this.bonusTriggered = false;
    this.bonusCutInActive = false;
    this.bonusSolved = 0;

    // テレメトリ＆セッション統計
    this.sessionStats = {
      score: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      wrongCount: 0,
      maxCombo: 0,
      enteredFever: false,
      hadSonicThinking: false,
      hadIronWill: false,
      bonusCorrect: 0,
      minAnswerTime: 999,
      answerTimes: [],
      subjectStats: {}, // 'subcategory': { correct: 0, total: 0, time: 0 }
      postErrorIntervals: [],
      consecutiveSonicHits: 0,
      consecutivePostFreezeHits: 0
    };
  }

  start(mode = 'all', selectedSubcategories = null, isRevenge = false) {
    this.isRevengeMode = isRevenge;
    this.totalTime = isRevenge ? 30.0 : 60.0;
    this.timeRemaining = this.totalTime;
    this.score = 0;
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.isFever = false;
    this.isFrozen = false;
    this.bonusTriggered = false;
    this.bonusCutInActive = false;
    this.bonusSolved = 0;

    // Reset session stats
    this.sessionStats = {
      score: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      wrongCount: 0,
      maxCombo: 0,
      enteredFever: false,
      hadSonicThinking: false,
      hadIronWill: false,
      bonusCorrect: 0,
      minAnswerTime: 999,
      answerTimes: [],
      subjectStats: {},
      postErrorIntervals: [],
      consecutiveSonicHits: 0,
      consecutivePostFreezeHits: 0
    };

    if (isRevenge) {
      // 復習マッチ: 弱点ノートから出題
      const weaknesses = storage.getPendingWeaknesses();
      this.questionQueue = dataLoader.shuffle([...weaknesses]);
    } else {
      this.questionQueue = dataLoader.getQuestionQueue(mode, selectedSubcategories);
    }

    this.currentIndex = 0;
    this.isActive = true;

    sound.startBGM(false);
    this.startTimer();
    this.nextQuestion();
  }

  startTimer() {
    if (this.timer) clearInterval(this.timer);
    const intervalMs = 100;

    this.timer = setInterval(() => {
      if (!this.isActive) return;

      this.timeRemaining = Math.max(0, this.timeRemaining - intervalMs / 1000);
      if (this.cb.onTick) {
        this.cb.onTick(this.timeRemaining, this.totalTime);
      }

      // ラストチャンス「一発逆転！難問ボーナス」判定
      // 残り15秒以下、かつ未発動、通常ゲームモード時
      if (!this.isRevengeMode && !this.bonusTriggered && this.timeRemaining <= 15.0 && this.timeRemaining > 2.0) {
        this.triggerHardBonusCutIn();
      }

      // フィーバー時のキラキラ
      if (this.isFever && Math.random() < 0.4) {
        fx.emitFeverSparks();
      }

      // タイムアップ判定
      if (this.timeRemaining <= 0) {
        this.finish();
      }
    }, intervalMs);
  }

  triggerHardBonusCutIn() {
    this.bonusTriggered = true;
    this.bonusCutInActive = true;

    // 警告演出
    sound.playWarning();
    fx.vibrate([100, 50, 100, 50, 200]);

    if (this.cb.onWarning) {
      this.cb.onWarning();
    }

    // 難問を1問キューの先頭へ割り込ませる
    const hardQ = dataLoader.getRandomHardQuestion();
    if (hardQ) {
      this.questionQueue.splice(this.currentIndex, 0, hardQ);
    }
  }

  nextQuestion() {
    if (this.currentIndex >= this.questionQueue.length) {
      // ループまたは終了
      if (this.isRevengeMode) {
        this.finish();
        return;
      }
      this.questionQueue = dataLoader.shuffle([...this.questionQueue]);
      this.currentIndex = 0;
    }

    this.currentQuestion = this.questionQueue[this.currentIndex];
    this.currentIndex++;
    this.questionStartTime = performance.now();

    if (this.cb.onQuestion) {
      this.cb.onQuestion(this.currentQuestion, this.isCurrentBonus());
    }
  }

  isCurrentBonus() {
    return this.currentQuestion && (this.currentQuestion.category === '難問ボーナス' || this.currentQuestion.category === '難関ボーナス' || this.bonusCutInActive);
  }

  // ユーザーの回答処理（YES=true, NO=false）
  submitAnswer(userBool) {
    if (!this.isActive || this.isFrozen || !this.currentQuestion) return;

    const answerDuration = (performance.now() - this.questionStartTime) / 1000;
    const isCorrect = userBool === this.currentQuestion.answer_bool;
    const isBonus = this.isCurrentBonus();
    const subcat = this.currentQuestion.subcategory || this.currentQuestion.category;

    // テレメトリ初期化
    if (!this.sessionStats.subjectStats[subcat]) {
      this.sessionStats.subjectStats[subcat] = { correct: 0, total: 0, time: 0 };
    }
    const stat = this.sessionStats.subjectStats[subcat];
    stat.total++;
    stat.time += answerDuration;

    this.sessionStats.totalAnswered++;
    this.sessionStats.answerTimes.push(answerDuration);
    if (answerDuration < this.sessionStats.minAnswerTime) {
      this.sessionStats.minAnswerTime = answerDuration;
    }

    // 出題分類進捗を永続化
    storage.recordQuestionResult(this.currentQuestion, isCorrect);

    if (isCorrect) {
      this.handleCorrect(answerDuration, isBonus, stat);
    } else {
      this.handleWrong(stat);
    }
  }

  handleCorrect(duration, isBonus, subjectStat) {
    subjectStat.correct++;
    this.sessionStats.totalCorrect++;
    this.currentCombo++;
    if (this.currentCombo > this.maxCombo) {
      this.maxCombo = this.currentCombo;
    }

    // 音速の思考判定（0.8秒以内連続）
    if (duration <= 0.8) {
      this.sessionStats.consecutiveSonicHits++;
      if (this.sessionStats.consecutiveSonicHits >= 3) {
        this.sessionStats.hadSonicThinking = true;
      }
    } else {
      this.sessionStats.consecutiveSonicHits = 0;
    }

    // 不撓不屈判定（ペナルティ後の連続正解）
    this.sessionStats.consecutivePostFreezeHits++;
    if (this.sessionStats.consecutivePostFreezeHits >= 3 && this.sessionStats.wrongCount > 0) {
      this.sessionStats.hadIronWill = true;
    }

    // スコア計算ロジック
    let baseScore = 100;
    if (isBonus) {
      baseScore = 1000; // 難問ボーナス大量得点！
      this.sessionStats.bonusCorrect++;
      this.bonusSolved++;
      this.bonusCutInActive = false;
      sound.playBonusCorrect();
      fx.triggerConfetti(60);
    } else {
      sound.playCorrect(this.currentCombo >= 3);
    }

    // スピードボーナス
    const speedBonus = Math.max(0, Math.round((2.0 - duration) * 50));

    // コンボ倍率
    let multiplier = 1.0;
    if (this.currentCombo >= 5) {
      multiplier = 2.0; // フィーバー2倍
      if (!this.isFever) {
        this.enterFever();
      }
    } else if (this.currentCombo >= 3) {
      multiplier = 1.5; // コンボ1.5倍
      sound.playCombo(this.currentCombo);
    }

    const addedScore = Math.round((baseScore + speedBonus) * multiplier);
    this.score += addedScore;
    this.sessionStats.score = this.score;

    // 演出
    fx.flashCorrect();

    if (this.cb.onScoreUpdate) {
      this.cb.onScoreUpdate(this.score, addedScore, this.currentCombo);
    }
    if (this.cb.onComboUpdate) {
      this.cb.onComboUpdate(this.currentCombo);
    }

    // 復習マッチ時、弱点克服
    if (this.isRevengeMode) {
      storage.overcomeWeakness(this.currentQuestion.id);
    }

    // 即座に次の問題へ（0.1秒 = 100ms）
    setTimeout(() => {
      if (this.isActive && !this.isFrozen) {
        this.nextQuestion();
      }
    }, 100);
  }

  enterFever() {
    this.isFever = true;
    this.sessionStats.enteredFever = true;
    // 残り時間 +2秒ボーナス
    this.timeRemaining = Math.min(this.totalTime, this.timeRemaining + 2.0);
    sound.playFever();
    sound.updateBgmSpeed(true);
    fx.triggerConfetti(35);

    if (this.cb.onFeverChange) {
      this.cb.onFeverChange(true, '+2秒 BONUS!');
    }
  }

  handleWrong(subjectStat) {
    this.sessionStats.wrongCount++;
    this.currentCombo = 0;
    this.sessionStats.consecutiveSonicHits = 0;
    this.sessionStats.consecutivePostFreezeHits = 0;

    if (this.isFever) {
      this.isFever = false;
      sound.updateBgmSpeed(false);
      if (this.cb.onFeverChange) {
        this.cb.onFeverChange(false, 'FEVER LOST');
      }
    }

    if (this.cb.onComboUpdate) {
      this.cb.onComboUpdate(0);
    }

    // 弱点ノートに追加
    storage.addWeakness(this.currentQuestion);

    // 不正解SEとクラッシュ演出
    sound.playWrong();

    // ペナルティ: 約2秒間の画面フリーズ・操作不能
    this.freezeInteraction(2000);
  }

  freezeInteraction(durationMs = 2000) {
    this.isFrozen = true;
    fx.triggerCrash(durationMs);

    let remainingFreeze = durationMs;
    const step = 200;

    if (this.cb.onFreezeTick) {
      this.cb.onFreezeTick(remainingFreeze / 1000);
    }

    const freezeTimer = setInterval(() => {
      remainingFreeze -= step;
      if (this.cb.onFreezeTick) {
        this.cb.onFreezeTick(Math.max(0, remainingFreeze / 1000));
      }

      if (remainingFreeze <= 0 || !this.isActive) {
        clearInterval(freezeTimer);
        this.isFrozen = false;
        if (this.cb.onFreezeTick) {
          this.cb.onFreezeTick(0);
        }
        if (this.isActive) {
          this.nextQuestion();
        }
      }
    }, step);
  }

  finish() {
    if (!this.isActive) return;
    this.isActive = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    sound.stopBGM();
    sound.playFinish();

    // 最終テレメトリ集計
    const totalAns = this.sessionStats.totalAnswered;
    const avgSpeed = totalAns > 0
      ? this.sessionStats.answerTimes.reduce((a, b) => a + b, 0) / totalAns
      : 2.0;
    const accuracy = totalAns > 0
      ? Math.round((this.sessionStats.totalCorrect / totalAns) * 100)
      : 0;

    // 思考速度の標準偏差（テンポの安定性 / 緩急）
    const times = this.sessionStats.answerTimes;
    let speedVariance = 0;
    if (times.length > 1) {
      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      speedVariance = Math.sqrt(times.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / times.length);
    }

    // 1秒未満の超速回答数
    const fastAnswersCount = times.filter(t => t < 1.0).length;

    // 知性ドメイン判定（理数IT、人文社会、語学国際、ビジネス実務、オールラウンダー）
    let domainScores = {
      stem: 0,        // 算数・数学・理科・情報
      humanities: 0,  // 国語・歴史・社会・地歴
      global: 0,      // 英語・英単語・国際
      business: 0     // 政治・経済・ITインフラ・ビジネス常識
    };
    Object.keys(this.sessionStats.subjectStats).forEach(subj => {
      const s = this.sessionStats.subjectStats[subj];
      if (s.total > 0) {
        const score = (s.correct / s.total) * s.total;
        if (/算数|数学|理科|物理|化学|生物|地学|情報/.test(subj)) domainScores.stem += score;
        if (/国語|歴史|社会|地理|地歴|公民/.test(subj)) domainScores.humanities += score;
        if (/英語|英単語|国際/.test(subj)) domainScores.global += score;
        if (/政治|経済|金融|インフラ|ビジネス/.test(subj)) domainScores.business += score;
      }
    });

    let intellectualDomain = 'allRounder';
    let maxDomainScore = 0;
    Object.entries(domainScores).forEach(([dom, sc]) => {
      if (sc > maxDomainScore && sc >= 2) {
        maxDomainScore = sc;
        intellectualDomain = dom;
      }
    });

    // メンタル復元力（レジリエンス）判定
    let mentalRecovery = 'steady';
    if (this.sessionStats.hadIronWill || this.sessionStats.consecutivePostFreezeHits >= 2) {
      mentalRecovery = 'ironWill'; // ミス直後に即座に立ち直り連続正解
    } else if (this.sessionStats.wrongCount > 0) {
      mentalRecovery = this.sessionStats.minAnswerTime < 0.6 ? 'rush' : 'cautious';
    }

    // クラッチ勝負強さ指数 (0〜100)
    const clutchScore = Math.min(100, Math.round(
      (this.bonusSolved * 40) +
      (this.sessionStats.enteredFever ? 20 : 0) +
      (this.maxCombo >= 10 ? 25 : (this.maxCombo >= 5 ? 15 : 0)) +
      (mentalRecovery === 'ironWill' ? 15 : 0)
    ));

    // 得意科目・苦手科目の偏差計算
    let topSubject = '';
    let weakSubject = '';
    let highestDev = -999;
    let lowestDev = 999;

    Object.keys(this.sessionStats.subjectStats).forEach(key => {
      const s = this.sessionStats.subjectStats[key];
      if (s.total > 0) {
        const acc = s.correct / s.total;
        const avgSpd = s.time / s.total;
        // スコア指標: 正解率重視 / 解答時間
        const devScore = (acc * 100) / Math.max(0.5, avgSpd);
        if (devScore > highestDev) {
          highestDev = devScore;
          topSubject = key;
        }
        if (devScore < lowestDev) {
          lowestDev = devScore;
          weakSubject = key;
        }
      }
    });

    const player = storage.getPlayer();
    const pendingWeaknesses = storage.getPendingWeaknesses();

    const telemetry = {
      playerName: player ? player.name : 'チャレンジャー',
      weakCount: pendingWeaknesses ? pendingWeaknesses.length : 0,
      score: this.score,
      totalAnswered: totalAns,
      totalCorrect: this.sessionStats.totalCorrect,
      wrongCount: this.sessionStats.wrongCount,
      accuracy: accuracy,
      avgSpeed: avgSpeed,
      speedVariance: Number(speedVariance.toFixed(2)),
      fastAnswersCount: fastAnswersCount,
      maxCombo: this.maxCombo,
      bonusSolved: this.bonusSolved,
      topSubject: topSubject,
      weakSubject: weakSubject,
      intellectualDomain: intellectualDomain,
      domainScores: domainScores,
      mentalRecovery: mentalRecovery,
      clutchScore: clutchScore,
      postErrorReaction: this.sessionStats.minAnswerTime < 0.6 ? 'rush' : 'freeze'
    };

    // セッションを永続化＆アチーブメント判定
    const newAchievements = storage.recordPlaySession({
      score: this.score,
      totalAnswered: totalAns,
      totalCorrect: this.sessionStats.totalCorrect,
      wrongCount: this.sessionStats.wrongCount,
      maxCombo: this.maxCombo,
      enteredFever: this.sessionStats.enteredFever,
      hadSonicThinking: this.sessionStats.hadSonicThinking,
      hadIronWill: this.sessionStats.hadIronWill,
      bonusCorrect: this.sessionStats.bonusCorrect,
      minAnswerTime: this.sessionStats.minAnswerTime
    });

    if (this.cb.onFinish) {
      this.cb.onFinish({
        score: this.score,
        telemetry: telemetry,
        newAchievements: newAchievements,
        isRevenge: this.isRevengeMode
      });
    }
  }

  stop() {
    this.isActive = false;
    this.isFrozen = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    sound.stopBGM();
  }
}
