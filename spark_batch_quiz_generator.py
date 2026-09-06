import json
import os
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, BooleanType

def create_spark_session():
    return (
        SparkSession.builder
        .appName("QuizBatchGenerator")
        .master("local[*]")  # クラスタ環境では適切なmaster URLを指定
        .config("spark.driver.memory", "4g")
        .config("spark.executor.memory", "4g")
        .getOrCreate()
    )

def generate_partition_worker(task_iter):
    """
    各Sparkワーカー内で実行される生成処理
    google-genai ライブラリを使用
    """
    from google import genai
    from google.genai import types

    # 環境変数からAPIキーを取得
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    # 出力JSONスキーマの定義
    schema = {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "category": {"type": "string"},
                "subcategory": {"type": "string"},
                "source": {"type": "string"},
                "question": {"type": "string"},
                "answer": {"type": "string"},
                "answer_bool": {"type": "boolean"},
                "explanation": {"type": "string"}
            },
            "required": ["id", "category", "subcategory", "question", "answer", "answer_bool", "explanation"]
        }
    }

    results = []

    for task in task_iter:
        batch_id = task["batch_id"]
        category = task["category"]
        subcategory = task["subcategory"]
        count = task["count"]
        guidelines = task["guidelines"]

        prompt = f"""
あなたは高校生・受験生・大人向けの高速タイムアタッククイズの作問エキスパートです。
以下の条件に厳密に従い、2択（Yes/No）クイズを正確に {count} 問作成してください。

【カテゴリ】{category}
【サブカテゴリ】{subcategory}
【詳細要件】
{guidelines}

【ルール】
1. 答えは Yes または No のいずれかで一意に決まる命題文（〜である。）にすること。
2. 直感で引っかかりやすい良問を中心にすること。
3. 解説は2〜3行で簡潔かつ論理的に記述すること。
4. id は "{task['id_prefix']}-{batch_id:03d}-" に連番を振ること。
"""

        try:
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=0.7
                )
            )
            items = json.loads(response.text)
            for item in items:
                # sourceフィールドが存在しない場合は補完
                if "source" not in item:
                    item["source"] = task.get("default_source", "")
                results.append((
                    item.get("id", ""),
                    item.get("category", category),
                    item.get("subcategory", subcategory),
                    item.get("source", ""),
                    item.get("question", ""),
                    item.get("answer", ""),
                    bool(item.get("answer_bool")),
                    item.get("explanation", "")
                ))
        except Exception as e:
            # エラーハンドリング（本番時はリトライ機構を推奨）
            print(f"Error in batch {batch_id}: {e}")

    return iter(results)


def main():
    spark = create_spark_session()
    sc = spark.sparkContext

    # 3,700問の生成タスクを細分化（APIの出力制限を考慮し、1タスクあたり25問ずつ分割）
    tasks = []
    batch_counter = 1

    # 1. 小中復習（追加900問 -> 25問 × 36タスク）
    subs_sc = ["算数・数学", "理科", "社会", "国語", "英語"]
    for i in range(36):
        sub = subs_sc[i % len(subs_sc)]
        tasks.append({
            "batch_id": batch_counter,
            "id_prefix": "SC_ADD",
            "category": "小中復習",
            "subcategory": sub,
            "count": 25,
            "guidelines": "高校受験〜小中学基礎レベル。瞬発力で解けるが勘違いしやすい定義や引っかけ問題。",
            "default_source": "小中基礎"
        })
        batch_counter += 1

    # 2. 高1基礎（英単語500問 -> 25問 × 20タスク）
    for _ in range(20):
        tasks.append({
            "batch_id": batch_counter,
            "id_prefix": "H1_ENG",
            "category": "高1基礎",
            "subcategory": "英単語",
            "count": 25,
            "guidelines": "大学入試頻出英単語（ターゲット1900/シス単レベル）。「単語の意味は〜である。Yes/No」形式。",
            "default_source": "大学入試頻出単語"
        })
        batch_counter += 1

    # 3. 高1基礎（情報I 200問 -> 25問 × 8タスク）
    for _ in range(8):
        tasks.append({
            "batch_id": batch_counter,
            "id_prefix": "H1_INFO",
            "category": "高1基礎",
            "subcategory": "情報I",
            "count": 25,
            "guidelines": "高校情報I（プログラミング、ネットワーク、データ表現、著作権、暗号化）。",
            "default_source": "共通テスト情報I基礎"
        })
        batch_counter += 1

    # 4. 高1基礎（他教科 300問 -> 25問 × 12タスク）
    subs_h1 = ["数学I・A", "歴史総合", "地理総合", "公共", "物理基礎", "化学基礎", "生物基礎", "現代文・古文"]
    for i in range(12):
        sub = subs_h1[i % len(subs_h1)]
        tasks.append({
            "batch_id": batch_counter,
            "id_prefix": "H1_BASE",
            "category": "高1基礎",
            "subcategory": sub,
            "count": 25,
            "guidelines": "高1で習う基礎事項・公式・概念。",
            "default_source": "高1教科書・標準"
        })
        batch_counter += 1

    # 5. 高1対大学受験（共通テスト過去問改題 500問 -> 25問 × 20タスク）
    subs_kyotsu = ["英語リーディング", "数学I・A", "国語（現代文・古文・漢文）", "情報I", "社会（歴史総合・公共）", "理科基礎"]
    for i in range(20):
        sub = subs_kyotsu[i % len(subs_kyotsu)]
        tasks.append({
            "batch_id": batch_counter,
            "id_prefix": "KYOTSU",
            "category": "高1対大学受験",
            "subcategory": sub,
            "count": 25,
            "guidelines": "共通テスト（過去問・試作問題）の思考力問題を2択（Yes/No）に改題。問題文に【共通テスト 20xx年改題】等と付与。",
            "default_source": "共通テスト改題"
        })
        batch_counter += 1

    # 6. 高1問題用難問（難関大・模試過去問改題・出典付き 200問 -> 25問 × 8タスク）
    for _ in range(8):
        tasks.append({
            "batch_id": batch_counter,
            "id_prefix": "HARD_UNIV",
            "category": "難問ボーナス",
            "subcategory": "難関大学・模試",
            "count": 25,
            "guidelines": "東大・京大・早慶・駿台全国模試等の過去問をYes/Noの2択に改題。問題文冒頭に【東京大学 20xx年 改題】などの出典を明記。",
            "default_source": "難関大学/模試"
        })
        batch_counter += 1

    # 7. 一般教養・常識（追加900問 -> 25問 × 36タスク）
    subs_ge = ["時事", "政治", "経済", "地理", "歴史", "IT・テクノロジー"]
    for i in range(36):
        sub = subs_ge[i % len(subs_ge)]
        tasks.append({
            "batch_id": batch_counter,
            "id_prefix": "GE_ADD",
            "category": "一般教養",
            "subcategory": sub,
            "count": 25,
            "guidelines": "雑学は除外。大人が知っておくべき時事・政治・経済・国際情勢・ITインフラ・歴史常識。",
            "default_source": "現代教養"
        })
        batch_counter += 1

    print(f"Total task partitions created: {len(tasks)} (Generating ~{len(tasks) * 25} questions)")

    # Spark RDDに並列分散（ノード数やコア数に合わせてパーティション数を設定）
    tasks_rdd = sc.parallelize(tasks, numSlices=len(tasks))

    # 各ワーカーでAPI並行呼び出し
    quiz_records_rdd = tasks_rdd.mapPartitions(generate_partition_worker)

    # DataFrameスキーマ定義
    schema = StructType([
        StructField("id", StringType(), False),
        StructField("category", StringType(), False),
        StructField("subcategory", StringType(), True),
        StructField("source", StringType(), True),
        StructField("question", StringType(), False),
        StructField("answer", StringType(), False),
        StructField("answer_bool", BooleanType(), False),
        StructField("explanation", StringType(), True),
    ])

    df = spark.createDataFrame(quiz_records_rdd, schema)

    # キャッシュして件数カウント
    df.cache()
    print(f"Generated successfully: {df.count()} questions")

    # 1. 単一のJSONファイルにまとめて出力
    df.coalesce(1).write.mode("overwrite").json("output_quiz_json")

    # 2. 高速検索用・分析用Parquet形式で出力
    df.write.mode("overwrite").partitionBy("category", "subcategory").parquet("output_quiz_parquet")

    spark.stop()

if __name__ == "__main__":
    main()

