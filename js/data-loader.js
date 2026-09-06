/**
 * Question Data Loader & Filter Logic (data-loader.js)
 * Loads generated_quiz_all.json (3,700 questions) with fallback to legacy sets.
 * Filters questions by mode and subjects with smart matching.
 */

class DataLoader {
  constructor() {
    this.allQuestions = [];
    this.hardQuestions = [];
    this.isLoaded = false;
  }

  async load() {
    if (this.isLoaded) return true;

    // 1. 本番用 3,700問 DB (generated_quiz_all.json) を最優先ロード
    try {
      const res = await fetch('./generated_quiz_all.json');
      if (res.ok) {
        this.allQuestions = await res.json();
        this.hardQuestions = this.allQuestions.filter(q => q.category === '難問ボーナス');
        this.isLoaded = true;
        console.log(`[DataLoader] Loaded 3,700 Quiz DB: ${this.allQuestions.length} questions (Hard: ${this.hardQuestions.length})`);
        return true;
      }
    } catch (e) {
      console.warn('generated_quiz_all.json load failed, falling back to legacy sets:', e);
    }

    // 2. フォールバック: 従来の200問 + 難問30問
    try {
      const [res200, resHard] = await Promise.all([
        fetch('./quiz_questions_200.json'),
        fetch('./hard_quiz.json')
      ]);

      if (!res200.ok || !resHard.ok) {
        throw new Error(`Failed to load fallback questions: 200=${res200.status}, hard=${resHard.status}`);
      }

      const q200 = await res200.json();
      const qHard = await resHard.json();
      this.allQuestions = [...q200, ...qHard];
      this.hardQuestions = qHard;
      this.isLoaded = true;
      return true;
    } catch (err) {
      console.error('Error loading fallback JSON files:', err);
      return false;
    }
  }

  getAllQuestions() {
    return this.allQuestions;
  }

  // カテゴリやサブカテゴリの一覧を取得
  getAvailableSubcategories() {
    const subs = new Set();
    this.allQuestions.forEach(q => {
      if (q.subcategory) subs.add(q.subcategory);
    });
    return Array.from(subs);
  }

  // 科目判定
  matchesSubject(q, selectedSubjects) {
    if (!selectedSubjects || selectedSubjects.length === 0) return true;
    const cat = q.category || '';
    const sub = q.subcategory || '';
    const combined = `${cat} ${sub}`;

    return selectedSubjects.some(subject => {
      if (subject === '算数・数学') {
        return combined.includes('算数') || combined.includes('数学');
      }
      if (subject === '理科') {
        return combined.includes('理科') || combined.includes('物理') || combined.includes('化学') || combined.includes('生物') || combined.includes('地学');
      }
      if (subject === '社会') {
        return combined.includes('社会') || combined.includes('歴史') || combined.includes('地理') || combined.includes('公民') || combined.includes('地歴');
      }
      if (subject === '国語') {
        return combined.includes('国語') || combined.includes('現代文') || combined.includes('古文') || combined.includes('漢文');
      }
      if (subject === '英語') {
        return combined.includes('英語') || combined.includes('英単語');
      }
      if (subject === '情報・IT' || subject === 'IT') {
        return combined.includes('情報') || combined.includes('IT') || combined.includes('インフラ');
      }
      if (subject === '政治・経済' || subject === '政治' || subject === '経済') {
        return combined.includes('政治') || combined.includes('経済') || combined.includes('金融') || combined.includes('公共') || combined.includes('法律');
      }
      if (subject === '国際・現代史' || subject === '国際' || subject === '現代史') {
        return combined.includes('国際') || combined.includes('現代史') || combined.includes('地政学');
      }
      if (subject === 'ビジネス常識') {
        return combined.includes('ビジネス') || combined.includes('マナー');
      }
      return combined.includes(subject);
    });
  }

  // モードと選択科目に基づいて出題プールを生成（シャッフル済み）
  getQuestionQueue(mode = 'all', selectedSubcategories = null) {
    let pool = [];

    if (mode === 'junior') {
      // 小中復習
      pool = this.allQuestions.filter(q => q.category === '小中復習');
    } else if (mode === 'high1') {
      // 高1基礎
      pool = this.allQuestions.filter(q => q.category === '高1基礎');
    } else if (mode === 'common') {
      // 高1対大学受験（共通テスト改題）
      pool = this.allQuestions.filter(q => q.category === '高1対大学受験');
    } else if (mode === 'general') {
      // 一般教養
      pool = this.allQuestions.filter(q => q.category === '一般教養');
    } else if (mode === 'hard') {
      // 難問ボーナス
      pool = this.hardQuestions.length > 0 ? [...this.hardQuestions] : this.allQuestions.filter(q => q.category === '難問ボーナス');
    } else {
      // 全ミックス
      pool = [...this.allQuestions];
    }

    // サブカテゴリフィルタが指定されている場合
    if (selectedSubcategories && selectedSubcategories.length > 0 && mode !== 'hard') {
      const filtered = pool.filter(q => this.matchesSubject(q, selectedSubcategories));
      if (filtered.length > 0) {
        pool = filtered;
      }
    }

    return this.shuffle([...pool]);
  }

  // 一発逆転ボーナス用の難問を1問取得
  getRandomHardQuestion(excludeIds = []) {
    const poolSrc = this.hardQuestions.length > 0 ? this.hardQuestions : this.allQuestions.filter(q => q.category === '難問ボーナス');
    const available = poolSrc.filter(q => !excludeIds.includes(q.id));
    const pool = available.length > 0 ? available : poolSrc;
    if (!pool || pool.length === 0) return null;
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
