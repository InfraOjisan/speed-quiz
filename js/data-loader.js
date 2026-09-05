/**
 * Question Data Loader & Filter Logic (data-loader.js)
 * Loads quiz_questions_200.json and hard_quiz.json, filters questions by mode and subjects
 */

class DataLoader {
  constructor() {
    this.questions200 = [];
    this.hardQuestions = [];
    this.isLoaded = false;
  }

  async load() {
    if (this.isLoaded) return true;
    try {
      const [res200, resHard] = await Promise.all([
        fetch('./quiz_questions_200.json'),
        fetch('./hard_quiz.json')
      ]);

      if (!res200.ok || !resHard.ok) {
        throw new Error(`Failed to load questions: 200=${res200.status}, hard=${resHard.status}`);
      }

      this.questions200 = await res200.json();
      this.hardQuestions = await resHard.json();
      this.isLoaded = true;
      return true;
    } catch (err) {
      console.error('Error loading question JSON files:', err);
      return false;
    }
  }

  getAllQuestions() {
    return [...this.questions200, ...this.hardQuestions];
  }

  // カテゴリやサブカテゴリの一覧を取得
  getAvailableSubcategories() {
    const subs = new Set();
    this.questions200.forEach(q => {
      subs.add(q.subcategory);
    });
    return Array.from(subs);
  }

  // モードと選択科目に基づいて出題プールを生成（シャッフル済み）
  getQuestionQueue(mode = 'all', selectedSubcategories = null) {
    let pool = [];

    if (mode === 'junior') {
      // 小中復習
      pool = this.questions200.filter(q => q.category === '小中復習');
    } else if (mode === 'general') {
      // 一般教養
      pool = this.questions200.filter(q => q.category === '一般教養');
    } else if (mode === 'hard') {
      // 難関ボーナス
      pool = [...this.hardQuestions];
    } else {
      // 全ミックス
      pool = [...this.questions200];
    }

    // サブカテゴリフィルタが指定されている場合
    if (selectedSubcategories && selectedSubcategories.length > 0 && mode !== 'hard') {
      const filtered = pool.filter(q => selectedSubcategories.includes(q.subcategory));
      if (filtered.length > 0) {
        pool = filtered;
      }
    }

    return this.shuffle([...pool]);
  }

  // 一発逆転ボーナス用の難問を1問取得
  getRandomHardQuestion(excludeIds = []) {
    const available = this.hardQuestions.filter(q => !excludeIds.includes(q.id));
    const pool = available.length > 0 ? available : this.hardQuestions;
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  // 配列シャッフル (Fisher-Yates)
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

export const dataLoader = new DataLoader();
