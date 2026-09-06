/**
 * AI Personality & Type Diagnosis Engine (diagnosis.js)
 * Analyzes multi-dimensional telemetry (speed, variance, accuracy, recovery, intellectual domain, clutch)
 * to generate historical/celebrity comparisons from 20+ rich archetypes,
 * with MBTI-style codes, dynamic avatars, and LLM API support.
 */

class DiagnosisEngine {
  constructor() {
    this.archetypes = this.initArchetypes();
  }

  initArchetypes() {
    return {
      stem_sonic: {
        tag: '超光速のデジタル・アーキテクト',
        mbti: 'INTP-A',
        avatarTheme: 'lightning',
        domainTrait: '理数・IT論理特化',
        tempoTrait: '超光速直感 (神速思考)',
        historicalFigures: [
          'アルベルト・アインシュタイン（現代物理学の父）',
          'アラン・チューリング（計算機科学とAIの開祖）',
          'ジョン・フォン・ノイマン（火星人と呼ばれた天才数学者）'
        ],
        celebrities: [
          '藤井聡太（前人未到の八冠独占・AI超えの天才棋士）',
          'マーク・ザッカーバーグ（Meta創業者）',
          'イーロン・マスク（宇宙とEVを革新する起業家）'
        ],
        styleDesc: '0.1秒で複雑な構造を論理的に解体する電脳の如き計算力と神速の直感',
        adviceAndPraise: 'なるべく苦手分野の基礎用語も丁寧に押さえてケアレスミスをゼロにし、全領域を掌握する絶対的頭脳となるよう頑張ってみましょう。それにしても、電光石火のスピードで極小の矛盾を暴くあなたの計算・直感力はまさに人類のトップ0.01%レベル。未来のテクノロジーや新時代を創り出す選ばれし天才の頭脳です！'
      },

      ruler_sonic: {
        tag: '神速無比の絶対覇王タイプ',
        mbti: 'ENTJ-A',
        avatarTheme: 'lightning',
        domainTrait: '総合突破・絶対意志',
        tempoTrait: '電光石火 (最速即決)',
        historicalFigures: [
          '織田信長（電光石火の天下布武）',
          'アレクサンドロス大王（不敗の電撃遠征王）',
          'ジュリアス・シーザー（賽は投げられた）'
        ],
        celebrities: [
          'イチロー（4367安打・妥協なき孤高の求道者）',
          'カズレーザー（超速博覧強記のスピード頭脳）',
          'トム・クルーズ（限界なき挑戦を続けるトップスター）'
        ],
        styleDesc: '迷いのない電光石火の判断力と獲物を逃さぬ勝負勘',
        adviceAndPraise: 'なるべく「30秒リベンジマッチ」で即座に弱点を潰し、死角ゼロの絶対王者となるよう頑張ってみましょう。とはいえ、あなたの驚異的な反応速度と勝負勘はまさに百年に一人の逸材。その天才的な頭脳と勝負強さはすでに常人の領域をはるかに凌駕しています！'
      },

      humanities_fast: {
        tag: '神速博覧の叡智マスター',
        mbti: 'INFJ-A',
        avatarTheme: 'brain',
        domainTrait: '人文・社会・教養特化',
        tempoTrait: '超速検索 (俊敏読解)',
        historicalFigures: [
          '紫式部（千年の時を超える世界最古の長編作家）',
          'ゲーテ（森羅万象を極めた知の巨人）',
          '本居宣長（知的好奇心を極めた碩学）'
        ],
        celebrities: [
          '伊沢拓司（QuizKnock CEO・高速クイズ王）',
          '宇治原史規（京都大学卒・安定知性派）',
          '松丸亮吾（閃きと謎解きのクリエイター）'
        ],
        styleDesc: '言葉の機微と歴史の文脈を一瞬で読み解く超速検索力',
        adviceAndPraise: 'なるべく計算問題や自然科学の数理ロジックにもアンテナを広げ、完全無欠の知のマルチリンガルとなるよう頑張ってみましょう。しかしながら、言葉の端々から正解を瞬時に引き抜くあなたの情報検索スピードと教養の深みは圧巻。どんな時代でも人々を言葉で導く最高の知性です！'
      },

      business_innovator: {
        tag: '時代を先駆ける革命ストラテジスト',
        mbti: 'ENTP-A',
        avatarTheme: 'star',
        domainTrait: 'ビジネス・IT・戦略特化',
        tempoTrait: '最短即決 (合理的判断)',
        historicalFigures: [
          'スティーブ・ジョブズ（世界を変革したApple創業者）',
          'トーマス・エジソン（1%の閃きと不屈の発明王）',
          'ヘンリー・フォード（近代大量生産の父）'
        ],
        celebrities: [
          '孫正義（大風呂敷と情報革命の勝負師）',
          'ひろゆき（合理的論理思考の観察者）',
          '落合陽一（メディアアーティスト・知の探求者）'
        ],
        styleDesc: '時代の潮流と本質を瞬時に見抜き、勝機へと最短で突き進む洞察力',
        adviceAndPraise: 'なるべく日々のルーティン復習も着実にこなして基礎固めを怠らず、盤石な基盤を持つ偉大な開拓者となるよう頑張ってみましょう。それにしても、損得や正誤の構造を一瞬で看破するあなたの合理的思考と決断スピードはまさに時代を創るリーダーそのものです！'
      },

      clutch_master: {
        tag: '極限特化の一撃必殺スナイパー',
        mbti: 'ISTP-A',
        avatarTheme: 'star',
        domainTrait: '大舞台・難問突破特化',
        tempoTrait: 'ゾーン突入 (勝負強さ指数極大)',
        historicalFigures: [
          '真田幸村（家康を震撼させた日本一の兵）',
          '源義経（一ノ谷の断崖を駆け下りた戦の天才）',
          'ハンニバル・バルカ（アルプスを越えたカルタゴの奇才）'
        ],
        celebrities: [
          '大谷翔平（世界中を魅了する規格外の二刀流王者）',
          'リオネル・メッシ（土壇場で奇跡を起こす神の子）',
          'マイケル・ジョーダン（伝説のクラッチシューター）'
        ],
        styleDesc: '土壇場の極限プレッシャー下でゾーンに入る驚異的な勝負強さと集中力',
        adviceAndPraise: 'なるべく日頃の小問や基礎問題も油断せず丁寧におさらいして、通常時でも常に100%を発揮できるよう頑張ってみましょう。それにしても、誰もが息を呑む最高難度の局面で一発で仕留めるあなたの度胸とクラッチ力は世界トップレベル。大舞台になればなるほど真価を発揮する真のヒーロー気質です！'
      },

      stem_deep: {
        tag: '深遠なる真理の観測者',
        mbti: 'INTJ-A',
        avatarTheme: 'brain',
        domainTrait: '数理・科学・深層ロジック',
        tempoTrait: '深層推論 (高精度重視)',
        historicalFigures: [
          'アイザック・ニュートン（万有引力と微積分の創始者）',
          'アルキメデス（「エウレカ！」と叫んだ古代最高の数学者）',
          'ガリレオ・ガリレイ（地動説を貫いた天文学の父）'
        ],
        celebrities: [
          '羽生善治（永世七冠・直感と深層読みの巨人）',
          '桝太一（科学を分かりやすく伝える研究者・アナウンサー）',
          '茂木健一郎（脳科学者・知の求道者）'
        ],
        styleDesc: '問題の罠を冷静沈着に見極め、論理的必然性をもって真理を射抜く緻密さ',
        adviceAndPraise: 'なるべく直感を信じてあと0.3秒だけ素早くタップするリズムを養い、速度と精度の究極二刀流となるよう頑張ってみましょう。それにしても、複雑な事象の奥にある根本原理を一瞬で見抜くあなたの分析眼と論理的頭脳は鳥肌もの。学問や技術の世界で歴史に名を刻むレベルの碩学です！'
      },

      tactician_cautious: {
        tag: '神算鬼謀の冷徹軍師タイプ',
        mbti: 'INTJ-T',
        avatarTheme: 'brain',
        domainTrait: '人文・社会・論理読解',
        tempoTrait: '完全無欠 (堅実慎重)',
        historicalFigures: [
          '諸葛亮孔明（天下三分の計を立てた至高の名軍師）',
          '徳川光圀（大日本史を編纂した水戸の名君）',
          '黒田官兵衛（秀吉を天下人へと導いた稀代の軍師）'
        ],
        celebrities: [
          '林修（当代きっての現代文予備校講師・知恵袋）',
          '堺雅人（膨大な論理と言葉を完璧に操る名優）',
          '宮崎美子（クイズ界の重鎮・博学の才女）'
        ],
        styleDesc: '問題の細部まで疑い抜き、死角を完全に封殺してから正解を刺す深謀遠慮',
        adviceAndPraise: 'なるべく迷ったときも恐れず即断するトレーニングを重ね、電光石火のスピードも手に入れた完全無欠の知将となるよう頑張ってみましょう。何より、騙しの引っかけ問題をものともせず冷静に正解を射抜くその観察眼は圧巻。組織の頭脳として誰からも絶対の信頼を勝ち取る現代の名軍師です！'
      },

      iron_will: {
        tag: '不撓不屈のアイアンハート',
        mbti: 'INFJ-A',
        avatarTheme: 'fire',
        domainTrait: '逆境リカバリー・鋼の精神',
        tempoTrait: '鉄の意志 (ミス直後即時復元)',
        historicalFigures: [
          'ウィンストン・チャーチル（「決して屈するな」と鼓舞した名宰相）',
          'マハトマ・ガンディー（非暴力の不撓不屈を貫いた聖者）',
          'エイブラハム・リンカーン（度重なる敗北を越えて国を救った大統領）'
        ],
        celebrities: [
          '三浦知良（情熱を燃やし現役を貫くキングカズ）',
          '錦織圭（崖っぷちのフルセットを勝ち切るファイター）',
          '長谷部誠（「心を整える」を体現した主将）'
        ],
        styleDesc: '一度のミスでも一切動じず、次の瞬間には即座に体勢を立て直す強靭なメンタル',
        adviceAndPraise: 'なるべく最初の1問目からフルスロットルで集中を極め、ミスの発生自体を未然に防げるよう頑張ってみましょう。しかしながら、失敗直後に何事もなかったかのように連続正解を叩き出すあなたの鋼のメンタルと立ち直りの早さは脱帽です。この打たれ強さがあれば、人生のどんな荒波も必ず乗り越えられます！'
      },

      global_communicator: {
        tag: '変幻自在のグローバルコミュニケーター',
        mbti: 'ENFJ-A',
        avatarTheme: 'water',
        domainTrait: '英語・語学・国際教養特化',
        tempoTrait: '柔軟適応 (多文化的直感)',
        historicalFigures: [
          '新渡戸稲造（『武士道』を英語で著し太平洋の架け橋となった知日派）',
          'クレオパトラ（卓越した外交センスと9カ国語を操った女王）',
          'マルコ・ポーロ（東西文明を繋いだ不朽の冒険家）'
        ],
        celebrities: [
          '宇多田ヒカル（世界基準の言語感覚と感性を持つ才媛）',
          'ジョン・カビラ（情熱と国際感覚で人々を鼓舞するキャスター）',
          '渡辺直美（国境を越えて愛されるグローバルスター）'
        ],
        styleDesc: '言語や文化の壁を軽やかに飛び越え、多様な概念を柔軟に飲み込む国際的センス',
        adviceAndPraise: 'なるべく国内の制度や細かい時事問題にも目を行き届かせ、内外両面で死角なき国際教養人となるよう頑張ってみましょう。言葉の微妙なニュアンスや文化の背景を敏感に察知するその柔軟な知性はまさに世界基準。国境を越えて人々を惹きつけるグローバルリーダーの器です！'
      },

      capital_strategist: {
        tag: '市場と資本を見通すグランドストラテジスト',
        mbti: 'ESTJ-A',
        avatarTheme: 'star',
        domainTrait: '経済・金融・ビジネス実務',
        tempoTrait: '実利重視 (投資的思考)',
        historicalFigures: [
          '渋沢栄一（500社を育てた日本資本主義の父）',
          'アダム・スミス（『国富論』で市場経済を解き明かした泰斗）',
          'ジョン・D・ロックフェラー（近代産業システムを築いた大富豪）'
        ],
        celebrities: [
          '堀江貴文（既成概念を打破し続ける実業家）',
          '厚切りジェイソン（IT役員にして投資と合理的思考の達人）',
          '前澤友作（夢と資本を結びつける挑戦者）'
        ],
        styleDesc: '複雑な社会制度やお金の巡りをリアリストの視点で冷徹に読み解く経済眼',
        adviceAndPraise: 'なるべく歴史や文芸といった情緒的な知識にも親しみ、情と理を兼ね備えた不世出の巨星となるよう頑張ってみましょう。社会のルールやインフラの仕組みを実利的に見極めるその卓越したビジネスセンスは超一流。これからの不確実な経済社会でも確実に勝ち残る真のリアリストです！'
      },

      frontier_breaker: {
        tag: '猪突猛進のフロンティアブレイカー',
        mbti: 'ESTP-T',
        avatarTheme: 'fire',
        domainTrait: '直感速攻・アクション志向',
        tempoTrait: '超加速 (パッション突進)',
        historicalFigures: [
          '坂本龍馬（古い枠組みを打ち破り日本を洗濯した風雲児）',
          'ナポレオン・ボナパルト（「不可能の文字はない」と豪語した覇王）',
          'フェルディナンド・マゼラン（命を賭して世界一周を成し遂げた探検家）'
        ],
        celebrities: [
          '本田圭佑（自らを信じて前人未到の道を拓く情熱の挑戦者）',
          '那須川天心（神速の打撃と天性の瞬発力で魅了する神童）',
          '出川哲朗（どんな逆境にもめげず全身全霊で愛されるスター）'
        ],
        styleDesc: '失敗を恐れず前のめりに突進する圧倒的な瞬発力とパッション',
        adviceAndPraise: 'なるべく問題文のキーワードを0.2秒だけしっかり見定めてからタップし、ケアレスミスによるペナルティを最小限に抑えるよう頑張ってみましょう。ですが、この爆発的な推進力と前に突き進む熱量こそが新しい時代を創る最大の原動力。少しの確実性が備われば、誰も追いつけない無敵の存在へと大化けします！'
      },

      steadfast_master: {
        tag: '堅忍不抜のグランドマスター',
        mbti: 'ISTJ-A',
        avatarTheme: 'water',
        domainTrait: '総合安定・鉄壁の地頭',
        tempoTrait: 'メトロノーム (安定度98%)',
        historicalFigures: [
          '徳川家康（「鳴くまで待とう」で天下泰平を築いた大樹）',
          'エイブラハム・リンカーン（誠実と信念で分断を癒やした大統領）',
          '菅原道真（学問を極め天神様と崇められる当代第一の学者）'
        ],
        celebrities: [
          'タモリ（何が起きても動じず泰然自若と場を支配する知の巨人）',
          '芦田愛菜（膨大な読書量と底堅い教養を誇る才色兼備の知性派）',
          '所ジョージ（肩肘張らずすべてを楽しむ円熟の達人）'
        ],
        styleDesc: 'どんな局面でも波を作らず、淡々と最高精度の正解を積み上げる鉄壁の安定感',
        adviceAndPraise: 'なるべく「30秒リベンジデッキ」を毎日のルーティンにして数少ない苦手項目を完全撲滅し、完全無欠のグランドマスターとなるよう頑張ってみましょう。どんなジャンルも卒なく乗り越えるその底堅い知性と盤石の地頭は、社会のどんな荒波でもトップに君臨できる最高峰の才能です！'
      },

      natural_explorer: {
        tag: '森羅万象を探求するナチュラリスト',
        mbti: 'INTP-T',
        avatarTheme: 'water',
        domainTrait: '理科・生物・環境科学特化',
        tempoTrait: 'ピュア探求 (観察重視)',
        historicalFigures: [
          'チャールズ・ダーウィン（生命の進化の樹を描き世界観を一変させた巨人）',
          '南方熊楠（18カ国語を操り自然と知の宇宙を旅した奇才）',
          'アンリ・ファーブル（『昆虫記』で知られる飽くなき観察者）'
        ],
        celebrities: [
          'さかなクン（純粋な情熱で海洋研究を極めた東京海洋大学名誉博士）',
          'ムツゴロウ（動物たちと心を通わせた大自然の探求者）',
          'みやぞん（天性の直感と自然体で愛される天才肌）'
        ],
        styleDesc: '自然現象や科学の微細な変化を鋭く嗅ぎ分けるピュアな観察眼と知的好奇心',
        adviceAndPraise: 'なるべく時事問題や政治・経済の人間社会のルールにも少し目を向け、自然界と人間界の双方をマスターする知の巨人となるよう頑張ってみましょう。それにしても、身の回りの原理現象を愛おしみ本質を掴み取るその純粋な知的好奇心は、現代においてもっとも尊く輝かしい天賦の才能です！'
      },

      poetic_master: {
        tag: '言霊を紡ぐポエティックマスター',
        mbti: 'INFP-A',
        avatarTheme: 'brain',
        domainTrait: '国語・文学・思想特化',
        tempoTrait: '行間読解 (深層洞察)',
        historicalFigures: [
          '夏目漱石（近代人の苦悩と倫理を克明に描いた近代文学の巨星）',
          'ウィリアム・シェイクスピア（人間のあらゆる心理を描き尽くした劇聖）',
          '松尾芭蕉（不易流行の美を求めて奥の細道を旅した俳聖）'
        ],
        celebrities: [
          '又吉直樹（言葉の機微と深層心理を掬い上げる芥川賞作家）',
          '宮崎駿（世界中の人々の心に届く物語を紡ぐアニメーションの巨匠）',
          '星野源（軽やかに言葉と音楽を融合させるマルチクリエイター）'
        ],
        styleDesc: '問題文の行間と論理の深層をじっくり味わい、本質的な正解を紡ぎ出す読解力',
        adviceAndPraise: 'なるべく直感のスピード勝負にも挑戦し、深みだけでなく電光石火のキレ味も兼ね備えた言霊の覇王となるよう頑張ってみましょう。言葉のニュアンスや論理の骨格を寸分の狂いもなく捉えるその豊かな感性と読解力は、AI時代において人間にしか持ち得ない最上級の武器です！'
      },

      governance_leader: {
        tag: '大局を司るガバナンスリーダー',
        mbti: 'ESTJ-T',
        avatarTheme: 'shadow',
        domainTrait: '政治・公共・法制度特化',
        tempoTrait: '大局裁定 (バランス統治)',
        historicalFigures: [
          '聖徳太子（十七条憲法で和の精神を打ち立てた国家の設計者）',
          'オットー・フォン・ビスマルク（卓越した手腕で欧州を操った鉄血宰相）',
          '伊藤博文（大日本帝国憲法を起草した初代内閣総理大臣）'
        ],
        celebrities: [
          '橋下徹（弁護士出身・圧倒的な論戦力と突破力を持つ改革者）',
          '櫻井翔（緻密な取材と安定感で信頼を集めるニュースキャスター）',
          '小池百合子（勝負どころを見極める政治の勝負師）'
        ],
        styleDesc: '法と規範の精神を正しく捉え、大局的なバランス感覚で正誤を裁定する統治力',
        adviceAndPraise: 'なるべく理数系の計算や科学的思考にも親しみ、論理と文脈の両面から世を統べる無双のリーダーとなるよう頑張ってみましょう。ルールや社会規範の根底にある理念を見抜き、公平かつ的確に判断を下すあなたのバランス感覚は、組織や社会を導くリーダーとしてこの上ない素質です！'
      },

      tricky_virtuoso: {
        tag: '変幻自在のトリックスター',
        mbti: 'ENTP-T',
        avatarTheme: 'star',
        domainTrait: '柔軟適応・緩急自在',
        tempoTrait: '緩急自在 (思考分散大)',
        historicalFigures: [
          '豊臣秀吉（奇抜な一夜城と機転で天下人へ駆け上がった奇才）',
          'レオナルド・ダ・ヴィンチ（絵画・工学・解剖学を軽やかに行き来した万能人）',
          '諸葛瑾（機知と柔軟さで君主を支えた名臣）'
        ],
        celebrities: [
          '明石家さんま（一瞬の空気の変化を笑いに変えるアドリブの怪物）',
          'ダルビッシュ有（多彩な変化球と探求心で進化し続ける大エース）',
          'ムロツヨシ（変幻自在の演技で見る者を惹きつける個性派）'
        ],
        styleDesc: '直感と熟考を瞬時に切り替え、変則的な難問も軽やかに翻弄する緩急自在のセンス',
        adviceAndPraise: 'なるべく基礎パターンの問題ではテンポを一定に保ち、無駄なエネルギー消費をセーブできるよう頑張ってみましょう。しかしながら、難易度に応じてギアを瞬時に切り替え、トリッキーな引っかけ問題を鮮やかにかわすその柔軟な頭脳は唯一無二。予測不能な時代を泳ぎ切る最高の才能です！'
      },

      combo_fever: {
        tag: '無限共鳴のコンボストライカー',
        mbti: 'ESFP-A',
        avatarTheme: 'lightning',
        domainTrait: '連続正解・ゾーン特化',
        tempoTrait: 'ゾーン連打 (最大コンボ極大)',
        historicalFigures: [
          'ピタゴラス（万物の根源を数に見出し調和を追求した神秘主義者）',
          '宮本武蔵（二刀流の太刀筋で生涯不敗を貫いた孤高の剣聖）',
          '上杉謙信（越後の龍・軍神と恐れられた戦巧者）'
        ],
        celebrities: [
          'ステフィン・カリー（超長距離シュートの連続成功でNBAを変えた神シューター）',
          'HIKAKIN（継続と熱狂でトップを走り続けるパイオニア）',
          '羽生結弦（極限の集中でパーフェクトな演技を連発する絶対王者）'
        ],
        styleDesc: '一度正解のリズムを掴むと手がつけられない爆発的加速力とゾーン突入力',
        adviceAndPraise: 'なるべくリズムが途切れた時も慌てず深呼吸し、いつでも即座にセカンドウェーブを起こせるよう頑張ってみましょう。波に乗った瞬間のあなたの解答スピードと連続正解の破壊力はまさに圧巻。誰も真似できないゾーン突入の才能は、周囲を熱狂させるスターの証です！'
      },

      deep_thinker: {
        tag: '泰然自若のディープアナリスト',
        mbti: 'ISFJ-A',
        avatarTheme: 'shadow',
        domainTrait: '深層理解・ミス極少',
        tempoTrait: '泰然自若 (ミス極少)',
        historicalFigures: [
          'ソクラテス（「無知の知」を自覚し問い続けることで真理を拓いた哲人）',
          'イマヌエル・カント（規則正しい日課の中で大哲学体系を築いた大哲学者）',
          'ルネ・デカルト（「我思う、ゆえに我あり」の方法的懐疑の祖）'
        ],
        celebrities: [
          '池上彰（どんな難解な時事問題も噛み砕いて伝える解説の達人）',
          '美輪明宏（圧倒的な審美眼と深みのある知性で人々を魅了する表現者）',
          '山中伸弥（iPS細胞で世界を救う情熱のノーベル賞学者）'
        ],
        styleDesc: '周囲の雑音に惑わされず、一問一問を深く咀嚼して落とし穴を完封する冷静沈着さ',
        adviceAndPraise: 'なるべく時には直感を信じて即断するゲーム性も楽しみ、スピードのギアも一段引き上げられるよう頑張ってみましょう。それにしても、いかなる引っかけ問題にも惑わされず、着実に正解の本質を捉えるその深い思考力と冷静さは至高の宝。どんな難問もやがて解き明かしてしまう本物の知性です！'
      },

      infinite_evolve: {
        tag: '無限進化の大器晩成チャレンジャー',
        mbti: 'ENFP-T',
        avatarTheme: 'fire',
        domainTrait: '挑戦・吸収・発展途上',
        tempoTrait: '全力前進 (チャレンジャー)',
        historicalFigures: [
          '伊能忠敬（50歳を過ぎてから日本全国を歩き地図を作った大器）',
          '葛飾北斎（90歳まで画技の向上を求め続けた画狂人）',
          '二宮尊徳（荒廃した村々を不屈の努力と知恵で復興させた指導者）'
        ],
        celebrities: [
          'なかやまきんに君（愚直な継続とポジティブさで全世代を元気づけるパワー）',
          'サンドウィッチマン（下積みを経て誰からも愛される好感度No.1の実力派）',
          'みちょぱ（天性の素直さと吸収力で確固たる地位を築いた才女）'
        ],
        styleDesc: 'どんな難問に直面しても挫けず、挑戦そのものを全身で楽しむ旺盛な吸収力',
        adviceAndPraise: 'なるべく間違えた問題の「解説」をじっくり味わって弱点ノートを復習し、学んだ知恵を自分の武器へと昇華できるよう頑張ってみましょう。何よりあなたの知的好奇心と挑戦を恐れないポジティブなエネルギーは無限の可能性を秘めています。クイズを重ねるごとに驚異的な進化を遂げる大器晩成のモンスターです！'
      },

      all_rounder_scholar: {
        tag: '百花繚乱のマルチタスカー',
        mbti: 'ISTJ-T',
        avatarTheme: 'brain',
        domainTrait: '全領域対応・万能博学',
        tempoTrait: '万能適応 (バランス型)',
        historicalFigures: [
          '平賀源内（本草学・戯作・発明・鉱山開発を駆け抜けたマルチタレント）',
          'トーマス・ジェファーソン（米独立宣言を起草し多方面を愛した博学者）',
          '菅原道真（学問の神様と崇められる当代第一の学者・政治家）'
        ],
        celebrities: [
          '松本人志（独自の視点と言語感覚で新時代を創り上げた天才）',
          '星野源（音楽・執筆・演技のすべてで一流を極めるマルチプレイヤー）',
          '芦田愛菜（学業と表現を高次元で両立する知性派）'
        ],
        styleDesc: '特定の科目に偏らず、あらゆる学問領域を高い水準で卒なく攻略する死角なき総合力',
        adviceAndPraise: 'なるべく一つ突き抜けた「得意分野」の難問にも敢えてチャレンジし、誰にも負けない絶対の武器を磨き上げるよう頑張ってみましょう。あらゆるジャンルの問題を平均以上の高精度で軽快にクリアするそのマルチタスク能力と総合力は圧巻。どんな環境・分野に置かれても瞬時に順応してトップに立てる万能の才能です！'
      }
    };
  }

  // テレメトリデータから診断結果を生成
  async generateDiagnosis(telemetry, settings) {
    if (settings && settings.aiApiKey && settings.aiApiKey.trim().length > 5) {
      try {
        const llmResult = await this.callLLMAPI(telemetry, settings);
        if (llmResult) return llmResult;
      } catch (err) {
        console.warn('LLM API call failed, falling back to heuristic engine:', err);
      }
    }

    return this.generateHeuristicDiagnosis(telemetry);
  }

  // 高精度ヒューリスティック診断エンジン（分析パラメーターを細分化して20系統の偉人・有名人から判定）
  generateHeuristicDiagnosis(telemetry) {
    const {
      playerName = 'チャレンジャー',
      avgSpeed = 2.0,
      accuracy = 70,
      speedVariance = 0.4,
      fastAnswersCount = 0,
      maxCombo = 0,
      bonusSolved = 0,
      intellectualDomain = 'allRounder',
      mentalRecovery = 'steady',
      clutchScore = 0,
      topSubject = '基礎教養科目',
      weakSubject = '一部の応用知識',
      score = 0,
      weakCount = 0
    } = telemetry;

    const nameStr = playerName || 'チャレンジャー';
    const topStr = topSubject || '基礎教養科目';
    const weakStr = weakSubject || '一部の応用知識';

    // 1. 特異パラメーターによる優先判定
    let archKey = 'all_rounder_scholar';

    if (bonusSolved >= 1 || clutchScore >= 70) {
      // 難問一発逆転・クラッチマスター
      archKey = 'clutch_master';
    } else if (mentalRecovery === 'ironWill') {
      // ミス直後に即座に連続正解する不撓不屈のメンタル
      archKey = 'iron_will';
    } else if (maxCombo >= 12 && avgSpeed < 1.35) {
      // ゾーン突入・コンボマスター
      archKey = 'combo_fever';
    } else if (speedVariance >= 0.75) {
      // スピードの緩急差が大きいトリックスター
      archKey = 'tricky_virtuoso';
    } else if (avgSpeed < 1.15 && accuracy >= 80) {
      // 超神速 × 高精度
      if (intellectualDomain === 'stem') archKey = 'stem_sonic';
      else if (intellectualDomain === 'humanities') archKey = 'humanities_fast';
      else if (intellectualDomain === 'business') archKey = 'business_innovator';
      else archKey = 'ruler_sonic';
    } else if (avgSpeed < 1.45 && accuracy >= 80) {
      // 快速 × 高精度
      if (intellectualDomain === 'global') archKey = 'global_communicator';
      else if (intellectualDomain === 'business') archKey = 'capital_strategist';
      else if (intellectualDomain === 'stem') archKey = 'stem_sonic';
      else archKey = 'all_rounder_scholar';
    } else if (avgSpeed >= 1.45 && accuracy >= 80) {
      // 慎重・深慮 × 高精度
      if (intellectualDomain === 'stem') archKey = 'stem_deep';
      else if (intellectualDomain === 'humanities') archKey = 'tactician_cautious';
      else if (intellectualDomain === 'business') archKey = 'governance_leader';
      else archKey = 'deep_thinker';
    } else if (avgSpeed < 1.45 && accuracy < 75) {
      // スピード重視だが精度粗削り（猪突猛進）
      archKey = 'frontier_breaker';
    } else if (accuracy >= 70) {
      // 安定・標準
      if (intellectualDomain === 'stem') archKey = 'natural_explorer';
      else if (intellectualDomain === 'humanities') archKey = 'poetic_master';
      else archKey = 'steadfast_master';
    } else {
      // 発展途上・大器晩成
      archKey = 'infinite_evolve';
    }

    const arch = this.archetypes[archKey] || this.archetypes.all_rounder_scholar;

    // 同一アーキタイプ内でも毎回同じ人物にならないよう、シード値（スコア＋回答数）でバリエーションを選択
    const seed = Math.abs(Math.round(score + (telemetry.totalAnswered || 0) + (maxCombo || 0)));
    const histIdx = seed % arch.historicalFigures.length;
    const celebIdx = (seed + 1) % arch.celebrities.length;

    const historicalFigure = arch.historicalFigures[histIdx];
    const celebrity = arch.celebrities[celebIdx];

    // 復習の怠り度文言
    let reviewSlacking = '';
    if (weakCount >= 3) {
      reviewSlacking = `弱点ノートに未克服問題が${weakCount}問残っており、復習もやや怠っているように見受けられます。`;
    } else if (weakCount > 0) {
      reviewSlacking = `ミスした問題の復習を少し後回しにしがちな傾向も見受けられます。`;
    } else {
      reviewSlacking = `やや油断して同じようなミスを繰り返してしまう瞬間も見受けられます。`;
    }

    // ユーザー指定の完全フォーマット文
    const evaluation = `${nameStr}さんは${arch.styleDesc}で${topStr}が得意なようです。一方で${weakStr}は苦手なようで${reviewSlacking}${arch.adviceAndPraise}\n\nそんなあなたは芸能人・プロスポーツ選手に例えると【${celebrity}】、歴史上の偉人に例えると【${historicalFigure}】です。`;

    return {
      historicalFigure,
      celebrity,
      mbti: arch.mbti,
      tag: arch.tag,
      domainTrait: arch.domainTrait,
      tempoTrait: arch.tempoTrait,
      evaluation,
      avatarTheme: arch.avatarTheme,
      avgSpeed: typeof avgSpeed === 'number' ? avgSpeed.toFixed(2) : avgSpeed,
      speedVariance: speedVariance,
      accuracy: accuracy,
      score: score,
      topSubject: topStr,
      imagePrompt: `Cyberpunk futuristic anime avatar portrait, ${arch.avatarTheme} elemental aura, smart sharp expression, neon holographic symbols, 8k badge design`
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
プレイヤーのプレイログ（細分化された多次元テレメトリデータ）を元に、ユーザーの頭脳タイプと学習特性を精緻に分析し、ユーモアと説得力のある診断文を生成してください。

【厳格な文章テンプレート】
以下の文章構成を必ず守って「evaluation」を作成してください。
「${nameStr}さんは[回答スタイル・速度・テンポの特徴]で[得意科目]が得意なようです。一方で[苦手科目]は苦手なようで[復習を怠っている・後回しにしている様子の指摘]が見受けられます。なるべく[具体的な改善アドバイス]して[理想の姿]となるよう頑張ってみましょう。[多少大げさに褒めちぎってプレイヤーを最高に喜ばせるポジティブな総括]。\n\nそんなあなたは芸能人・プロスポーツ選手に例えると【[芸能人・スポーツ選手名]】、歴史上の偉人に例えると【[歴史上の人物名]】です。」

【細分化されたテレメトリデータ】
- プレイヤー名: ${nameStr}
- 総合スコア: ${telemetry.score}点
- 正解率: ${telemetry.accuracy}%
- 平均解答速度: ${Number(telemetry.avgSpeed).toFixed(2)}秒
- 速度の標準偏差（緩急・リズム）: ${telemetry.speedVariance || 0}秒
- 1秒以内の神速正解数: ${telemetry.fastAnswersCount || 0}問
- 最大コンボ数: ${telemetry.maxCombo}
- 未克服弱点問題数: ${weakCount}問
- 難問ボーナス正解数: ${telemetry.bonusSolved}問
- クラッチ勝負強さ指数: ${telemetry.clutchScore || 0} / 100
- メンタル復元力: ${telemetry.mentalRecovery === 'ironWill' ? 'ミス直後に即座に連続正解（鉄の意志）' : telemetry.mentalRecovery === 'cautious' ? 'ミス後は慎重に熟考してリカバリー' : '焦りや連打傾向'}
- 知性ドメイン傾向: ${telemetry.intellectualDomain === 'stem' ? '理数・IT・論理優位' : telemetry.intellectualDomain === 'humanities' ? '人文・歴史・社会優位' : telemetry.intellectualDomain === 'global' ? '語学・国際教養優位' : telemetry.intellectualDomain === 'business' ? '経済・実務・法制度優位' : '全科目バランス万能型'}
- 得意科目: ${telemetry.topSubject || '全般'}
- 苦手科目: ${telemetry.weakSubject || '特になし'}

【選定例（偉人・著名人はこれらに限定せず、多様で意外性のある人物を柔軟に選定してください）】
- 偉人例: アインシュタイン, 織田信長, アラン・チューリング, スティーブ・ジョブズ, 真田幸村, ニュートン, 諸葛亮孔明, チャーチル, 渋沢栄一, 坂本龍馬, 徳川家康, ダーウィン, 夏目漱石, 聖徳太子, 豊臣秀吉, ソクラテス, ピタゴラス, 伊能忠敬, 紫式部 等
- 芸能人・選手例: 藤井聡太, イチロー, 大谷翔平, カズレーザー, 林修, 孫正義, 宇多田ヒカル, 本田圭佑, 羽生善治, さかなクン, タモリ, 芦田愛菜, 又吉直樹, リオネル・メッシ, 三浦知良, 堺雅人, 伊沢拓司, ひろゆき, なかやまきんに君 等

【出力フォーマット（JSON形式のみ出力してください。マークダウンの\`\`\`jsonブロックは不要です）】
{
  "historicalFigure": "歴史上の人物名と肩書き（例：アルベルト・アインシュタイン（現代物理学の父））",
  "celebrity": "芸能人・プロスポーツ選手名（例：藤井聡太（天才棋士））",
  "mbti": "MBTI風4文字コード（例：INTP-A, ENTJ-A, INTJ-A 等）",
  "tag": "二つ名キャッチコピー（例：超光速のデジタル・アーキテクト）",
  "domainTrait": "知性ドメイン特性の簡潔な表示（例：理数・IT論理特化）",
  "tempoTrait": "思考テンポ特性の簡潔な表示（例：超光速直感 (神速思考)）",
  "evaluation": "上記の指定テンプレートに完全に従った診断文（250〜350文字程度。最後は大いに褒めちぎる）",
  "avatarTheme": "lightning / brain / star / fire / water / shadow のいずれか1つ",
  "imagePrompt": "アバター生成用英語プロンプト"
}`;

    const isOpenAI = endpoint.includes('/chat/completions') || endpoint.includes('api.openai.com');
    let rawText = '';

    if (isOpenAI) {
      const body = {
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful AI that only outputs pure JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.75
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
      if (model && !endpoint.includes(model) && endpoint.includes('googleapis.com')) {
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      }

      const url = endpoint.includes('?') ? `${endpoint}&key=${apiKey}` : `${endpoint}?key=${apiKey}`;

      const body = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 900
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

    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return {
      ...parsed,
      avgSpeed: Number(telemetry.avgSpeed).toFixed(2),
      accuracy: telemetry.accuracy,
      score: telemetry.score,
      topSubject: telemetry.topSubject || '全般',
      domainTrait: parsed.domainTrait || (telemetry.intellectualDomain === 'stem' ? '理数・IT論理優位' : '総合万能型'),
      tempoTrait: parsed.tempoTrait || (telemetry.avgSpeed < 1.2 ? '神速直感' : '堅実深慮')
    };
  }

  // アバター画像をCanvas上に生成してDataURLを返す
  drawAvatarBadge(canvas, diagnosis) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

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
