/**
 * Storage & Game State Persistence (storage.js)
 * Manages player profile, achievements, revenge deck weaknesses, category progress, telemetry
 */

const STORAGE_KEY = 'speedquiz_poc_data_v1';

// アチーブメント定義リスト（全20種類以上の二つ名・称号）
export const ACHIEVEMENTS = [
  { id: 'first_play', title: '初陣', desc: '初めてのタイムアタックを完了した', titleReward: '疾風のルーキー' },
  { id: 'sonic_thought', title: '音速の思考', desc: '0.8秒以内に3問連続で正解した', titleReward: '電光石火の求道者' },
  { id: 'reverse_sniper', title: '逆転スナイパー', desc: '一発逆転ボーナス難問に正解した', titleReward: '難関キラー' },
  { id: 'fever_master', title: 'フィーバーマスター', desc: '1プレイで5連続正解しフィーバーに突入した', titleReward: '覚醒の熱狂者' },
  { id: 'revenge_demon', title: 'リベンジの鬼', desc: '30秒復習マッチでミス問題を克服した', titleReward: '不屈のリベンジャー' },
  { id: 'score_5000', title: 'ハイスコア5000', desc: '1回のプレイで5,000点以上を獲得した', titleReward: 'スコアハンター' },
  { id: 'score_10000', title: 'ハイスコア10000', desc: '1回のプレイで10,000点以上を獲得した', titleReward: '絶対王者の風格' },
  { id: 'combo_10', title: 'テンポの支配者', desc: '10連続コンボを達成した', titleReward: 'ゾーン突入者' },
  { id: 'iron_will', title: '不撓不屈', desc: 'クラッシュペナルティの後に3問連続正解した', titleReward: '蘇りし不死鳥' },
  { id: 'flawless_run', title: '完全無欠', desc: '一度もミスせずに1プレイ（最低10問以上）完走した', titleReward: 'パーフェクトマスター' },
  { id: 'speed_demon', title: '神速の反射神経', desc: '0.5秒未満で正解した', titleReward: 'マッハブレイン' },
  { id: 'science_whiz', title: '理科の達人', desc: '理科の問題を10問以上正解した', titleReward: '現代のニュートン' },
  { id: 'math_whiz', title: '数理の覇者', desc: '算数・数学の問題を10問以上正解した', titleReward: '孤高の幾何学者' },
  { id: 'social_whiz', title: '時事・社会の通', desc: '政治・経済・社会の問題を15問以上正解した', titleReward: '知性派ストラテジスト' },
  { id: 'it_native', title: 'デジタルネイティブ', desc: 'IT・情報の問題を10問以上正解した', titleReward: 'サイバー知性体' },
  { id: 'hardcore_scholar', title: '名門キラー', desc: '難問ボーナスを累計3問以上正解した', titleReward: '学問の巨星' },
  { id: 'play_10_times', title: '習慣の力', desc: '累計10回プレイした', titleReward: '超高速の探求者' },
  { id: 'solve_100', title: '百問踏破', desc: '累計100問正解した', titleReward: '歩く百科事典' },
  { id: 'weakness_cleaner', title: '弱点殲滅', desc: '弱点ノートから3問以上克服した', titleReward: '完全克服の達人' },
  { id: 'super_family', title: '博覧強記の大人', desc: '一般教養モードで正解率90%以上を記録した', titleReward: '雑学マスター' }
];

class StorageManager {
  constructor() {
    this.data = this.load();
  }

  getDefaultData() {
    return {
      player: {
        name: 'チャレンジャー',
        currentTitle: '疾風のルーキー',
        equippedTitles: ['疾風のルーキー']
      },
      stats: {
        totalPlays: 0,
        totalScore: 0,
        highScore: 0,
        totalQuestionsAnswered: 0,
        totalCorrect: 0,
        maxComboEver: 0,
        bonusQuestionsCorrect: 0,
        lastPlayTimestamp: null
      },
      achievements: {}, // id: { unlocked: true, unlockedAt: 'ISOString' }
      categoryProgress: {}, // "category > subcategory": { seen: Set/Array, correct: Set/Array }
      weaknesses: [], // [ { id, question, answer, answer_bool, explanation, category, subcategory, missCount, overcome: bool, lastMissedAt } ]
      diagnosisHistory: [], // [ { date, title, mbti, personality, avatarSeed, telemetry } ]
      settings: {
        soundEnabled: true,
        bgmEnabled: true,
        vibrationEnabled: true,
        aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        aiApiKey: ''
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultData();
      const parsed = JSON.parse(raw);
      // Merge with default in case of new schema keys
      const def = this.getDefaultData();
      return {
        ...def,
        ...parsed,
        player: { ...def.player, ...(parsed.player || {}) },
        stats: { ...def.stats, ...(parsed.stats || {}) },
        achievements: { ...def.achievements, ...(parsed.achievements || {}) },
        categoryProgress: parsed.categoryProgress || {},
        weaknesses: parsed.weaknesses || [],
        diagnosisHistory: parsed.diagnosisHistory || [],
        settings: { ...def.settings, ...(parsed.settings || {}) }
      };
    } catch (e) {
      console.error('Failed to load storage, resetting to default', e);
      return this.getDefaultData();
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  getPlayer() {
    return this.data.player;
  }

  updatePlayer(name, title = null) {
    if (name) this.data.player.name = name.trim().slice(0, 16) || 'チャレンジャー';
    if (title) this.data.player.currentTitle = title;
    this.save();
  }

  getStats() {
    return this.data.stats;
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
  }

  // 弱点デッキ管理
  addWeakness(questionObj) {
    const existing = this.data.weaknesses.find(w => w.id === questionObj.id);
    if (existing) {
      existing.missCount = (existing.missCount || 1) + 1;
      existing.overcome = false;
      existing.lastMissedAt = new Date().toISOString();
    } else {
      this.data.weaknesses.push({
        id: questionObj.id,
        category: questionObj.category,
        subcategory: questionObj.subcategory,
        source: questionObj.source || '',
        question: questionObj.question,
        answer: questionObj.answer,
        answer_bool: questionObj.answer_bool,
        explanation: questionObj.explanation,
        missCount: 1,
        overcome: false,
        lastMissedAt: new Date().toISOString()
      });
    }
    this.save();
  }

  overcomeWeakness(questionId) {
    const item = this.data.weaknesses.find(w => w.id === questionId);
    if (item) {
      item.overcome = true;
      item.overcomeAt = new Date().toISOString();
      this.save();
      this.checkAndUnlockAchievement('revenge_demon');
      const overcomeCount = this.data.weaknesses.filter(w => w.overcome).length;
      if (overcomeCount >= 3) {
        this.checkAndUnlockAchievement('weakness_cleaner');
      }
    }
  }

  getPendingWeaknesses() {
    return this.data.weaknesses.filter(w => !w.overcome);
  }

  getAllWeaknesses() {
    return this.data.weaknesses;
  }

  // 出題進捗の更新（「小学理科 n/m x%完了」など）
  recordQuestionResult(questionObj, isCorrect) {
    const catKey = `${questionObj.category} > ${questionObj.subcategory}`;
    if (!this.data.categoryProgress[catKey]) {
      this.data.categoryProgress[catKey] = { seenIds: [], correctIds: [] };
    }
    const prog = this.data.categoryProgress[catKey];
    if (!prog.seenIds.includes(questionObj.id)) {
      prog.seenIds.push(questionObj.id);
    }
    if (isCorrect && !prog.correctIds.includes(questionObj.id)) {
      prog.correctIds.push(questionObj.id);
    }
    this.save();
  }

  getCategoryProgressList(allQuestions) {
    // カテゴリごとの総問題数を集計
    const totalByCat = {};
    allQuestions.forEach(q => {
      const key = `${q.category} > ${q.subcategory}`;
      totalByCat[key] = (totalByCat[key] || 0) + 1;
    });

    return Object.keys(totalByCat).map(catKey => {
      const prog = this.data.categoryProgress[catKey] || { seenIds: [], correctIds: [] };
      const total = totalByCat[catKey];
      const correct = prog.correctIds.length;
      const seen = prog.seenIds.length;
      const percent = Math.round((correct / total) * 100);
      return {
        categoryKey: catKey,
        total,
        seen,
        correct,
        percent
      };
    });
  }

  // プレイ結果の記録＆アチーブメント判定
  recordPlaySession(sessionData) {
    const stats = this.data.stats;
    stats.totalPlays += 1;
    stats.totalScore += sessionData.score;
    if (sessionData.score > stats.highScore) {
      stats.highScore = sessionData.score;
    }
    stats.totalQuestionsAnswered += sessionData.totalAnswered;
    stats.totalCorrect += sessionData.totalCorrect;
    if (sessionData.maxCombo > stats.maxComboEver) {
      stats.maxComboEver = sessionData.maxCombo;
    }
    if (sessionData.bonusCorrect) {
      stats.bonusQuestionsCorrect += sessionData.bonusCorrect;
    }
    stats.lastPlayTimestamp = new Date().toISOString();

    // アチーブメントアンロック判定
    const newlyUnlocked = [];

    // 初陣
    if (this.checkAndUnlockAchievement('first_play')) newlyUnlocked.push('first_play');
    // 音速の思考
    if (sessionData.hadSonicThinking && this.checkAndUnlockAchievement('sonic_thought')) newlyUnlocked.push('sonic_thought');
    // 逆転スナイパー
    if (sessionData.bonusCorrect > 0 && this.checkAndUnlockAchievement('reverse_sniper')) newlyUnlocked.push('reverse_sniper');
    // フィーバーマスター
    if (sessionData.enteredFever && this.checkAndUnlockAchievement('fever_master')) newlyUnlocked.push('fever_master');
    // ハイスコア
    if (sessionData.score >= 5000 && this.checkAndUnlockAchievement('score_5000')) newlyUnlocked.push('score_5000');
    if (sessionData.score >= 10000 && this.checkAndUnlockAchievement('score_10000')) newlyUnlocked.push('score_10000');
    // 10コンボ
    if (sessionData.maxCombo >= 10 && this.checkAndUnlockAchievement('combo_10')) newlyUnlocked.push('combo_10');
    // 不撓不屈
    if (sessionData.hadIronWill && this.checkAndUnlockAchievement('iron_will')) newlyUnlocked.push('iron_will');
    // 完全無欠
    if (sessionData.totalAnswered >= 10 && sessionData.wrongCount === 0 && this.checkAndUnlockAchievement('flawless_run')) newlyUnlocked.push('flawless_run');
    // 神速
    if (sessionData.minAnswerTime < 0.5 && this.checkAndUnlockAchievement('speed_demon')) newlyUnlocked.push('speed_demon');
    // 累計回数・正解数
    if (stats.totalPlays >= 10 && this.checkAndUnlockAchievement('play_10_times')) newlyUnlocked.push('play_10_times');
    if (stats.totalCorrect >= 100 && this.checkAndUnlockAchievement('solve_100')) newlyUnlocked.push('solve_100');
    if (stats.bonusQuestionsCorrect >= 3 && this.checkAndUnlockAchievement('hardcore_scholar')) newlyUnlocked.push('hardcore_scholar');

    this.save();
    return newlyUnlocked.map(id => ACHIEVEMENTS.find(a => a.id === id));
  }

  checkAndUnlockAchievement(id) {
    if (!this.data.achievements[id]) {
      this.data.achievements[id] = {
        unlocked: true,
        unlockedAt: new Date().toISOString()
      };
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (def && !this.data.player.equippedTitles.includes(def.titleReward)) {
        this.data.player.equippedTitles.push(def.titleReward);
      }
      return true;
    }
    return false;
  }

  isAchievementUnlocked(id) {
    return !!this.data.achievements[id];
  }

  getUnlockedAchievementsCount() {
    return Object.keys(this.data.achievements).length;
  }

  // 診断履歴の保存
  saveDiagnosis(diagnosis) {
    this.data.diagnosisHistory.unshift({
      date: new Date().toISOString(),
      ...diagnosis
    });
    // 直近20件のみ保持
    if (this.data.diagnosisHistory.length > 20) {
      this.data.diagnosisHistory.pop();
    }
    this.save();
  }

  // データの初期化
  clearAllData() {
    this.data = this.getDefaultData();
    this.save();
  }

  // 成績データのダウンロード用
  exportDataAsJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  exportDataAsCSV() {
    let csv = '種別,項目,値\n';
    csv += `プレイヤー,名前,"${this.data.player.name}"\n`;
    csv += `プレイヤー,称号,"${this.data.player.currentTitle}"\n`;
    csv += `成績,総プレイ回数,${this.data.stats.totalPlays}\n`;
    csv += `成績,ハイスコア,${this.data.stats.highScore}\n`;
    csv += `成績,総得点,${this.data.stats.totalScore}\n`;
    csv += `成績,総解答数,${this.data.stats.totalQuestionsAnswered}\n`;
    csv += `成績,総正解数,${this.data.stats.totalCorrect}\n`;
    csv += `成績,最大コンボ,${this.data.stats.maxComboEver}\n`;
    csv += `アチーブメント,獲得数,${this.getUnlockedAchievementsCount()}/${ACHIEVEMENTS.length}\n`;
    csv += `復習,弱点総数,${this.data.weaknesses.length}\n`;
    csv += `復習,克服済み数,${this.data.weaknesses.filter(w => w.overcome).length}\n`;
    return csv;
  }
}

export const storage = new StorageManager();
