import asyncio
import json
import os
import sys
from google import genai
from google.genai import types

SCHEMA = {
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

OUTPUT_FILE = "generated_quiz_stream.jsonl"
LOCK = asyncio.Lock()

def get_completed_batch_ids():
    """中断再開用：すでに保存されたbatch_idを読み込む"""
    completed = set()
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    item = json.loads(line)
                    if "_batch_id" in item:
                        completed.add(item["_batch_id"])
                except:
                    pass
    return completed

async def generate_task(client, task, sem, completed_ids):
    batch_id = task["batch_id"]
    if batch_id in completed_ids:
        print(f"[{task['id_prefix']} #{batch_id:03d}] スキップ（生成済み）", flush=True)
        return

    async with sem:
        prompt = f"""
あなたは高速クイズの作問エキスパートです。
以下の条件に従い、2択（Yes/No）クイズを正確に {task['count']} 問作成してください。

【カテゴリ】{task['category']}
【サブカテゴリ】{task['subcategory']}
【詳細要件】{task['guidelines']}

【ルール】
1. 答えは Yes または No のいずれかで一意に決まる命題文（〜である。）にすること。
2. 直感で引っかかりやすい良問を中心にすること。
3. 解説は2〜3行で簡潔に記述すること。
4. id は "{task['id_prefix']}-{batch_id:03d}-" に連番を振ること。
5. 「エラー」「Error」「未定」といった文字列は含めないこと。
"""
        for retry in range(3):
            try:
                # 60秒タイムアウトを設定
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model="gemini-1.5-flash",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=SCHEMA,
                            temperature=0.7
                        )
                    ),
                    timeout=60.0
                )

                items = json.loads(response.text)
                valid_items = []
                for item in items:
                    q = item.get("question", "")
                    if "エラー" in q or "Error" in q or not q:
                        continue
                    if "source" not in item or not item["source"]:
                        item["source"] = task.get("default_source", "")
                    item["_batch_id"] = batch_id
                    valid_items.append(item)

                # 1バッチ完了ごとに即座にディスクへ追記
                async with LOCK:
                    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
                        for item in valid_items:
                            f.write(json.dumps(item, ensure_ascii=False) + "\n")
                        f.flush()

                print(f"[{task['id_prefix']} #{batch_id:03d}] 保存完了: {len(valid_items)}問", flush=True)
                return

            except asyncio.TimeoutError:
                print(f"[{task['id_prefix']} #{batch_id:03d}] タイムアウト (試行 {retry+1}/3)", flush=True)
                await asyncio.sleep(3)
            except Exception as e:
                print(f"[{task['id_prefix']} #{batch_id:03d}] リトライ待機 ({retry+1}/3): {e}", flush=True)
                await asyncio.sleep(4 * (retry + 1))

        print(f"[{task['id_prefix']} #{batch_id:03d}] × 生成失敗（3回試行）", flush=True)

def build_tasks():
    tasks = []
    b = 1
    # 1. 小中復習 (900問 -> 36タスク)
    subs_sc = ["算数・数学", "理科", "社会", "国語", "英語"]
    for i in range(36):
        tasks.append({"batch_id": b, "id_prefix": "SC_ADD", "category": "小中復習", "subcategory": subs_sc[i%5], "count": 25, "guidelines": "小中学基礎。直感で勘違いしやすい定義や引っかけ問題。", "default_source": "小中基礎"})
        b += 1
    # 2. 高1基礎（英単語 500問 -> 20タスク）
    for _ in range(20):
        tasks.append({"batch_id": b, "id_prefix": "H1_ENG", "category": "高1基礎", "subcategory": "英単語", "count": 25, "guidelines": "大学入試頻出英単語（ターゲット1900/シス単）。単語の意味判定。", "default_source": "大学入試頻出単語"})
        b += 1
    # 3. 高1基礎（情報I 200問 -> 8タスク）
    for _ in range(8):
        tasks.append({"batch_id": b, "id_prefix": "H1_INFO", "category": "高1基礎", "subcategory": "情報I", "count": 25, "guidelines": "高校情報I（プログラミング、ネットワーク、データ表現、暗号化）。", "default_source": "共通テスト情報I基礎"})
        b += 1
    # 4. 高1基礎（他教科 300問 -> 12タスク）
    subs_h1 = ["数学I・A", "歴史総合", "地理総合", "公共", "物理基礎", "化学基礎", "生物基礎", "現代文・古文"]
    for i in range(12):
        tasks.append({"batch_id": b, "id_prefix": "H1_BASE", "category": "高1基礎", "subcategory": subs_h1[i%8], "count": 25, "guidelines": "高1で習う基礎事項・公式・重要用語。", "default_source": "高1教科書・標準"})
        b += 1
    # 5. 高1対大学受験（共通テスト改題 500問 -> 20タスク）
    subs_kyo = ["英語リーディング", "数学I・A", "国語", "情報I", "社会", "理科基礎"]
    for i in range(20):
        tasks.append({"batch_id": b, "id_prefix": "KYOTSU", "category": "高1対大学受験", "subcategory": subs_kyo[i%6], "count": 25, "guidelines": "共通テストの思考力問題をYes/No改題。問題文冒頭に【共通テスト 20xx年改題】と記載。", "default_source": "共通テスト改題"})
        b += 1
    # 6. 高1用難問ボーナス（200問 -> 8タスク）
    for _ in range(8):
        tasks.append({"batch_id": b, "id_prefix": "HARD_UNIV", "category": "難問ボーナス", "subcategory": "難関大学・模試", "count": 25, "guidelines": "東大・京大・早慶等の良問をYes/No改題。問題文冒頭に【東京大学 20xx年 改題】などの出典明記。", "default_source": "難関大学/模試"})
        b += 1
    # 7. 一般教養（900問 -> 36タスク）
    subs_ge = ["時事", "政治", "経済", "地理", "歴史", "IT・テクノロジー"]
    for i in range(36):
        tasks.append({"batch_id": b, "id_prefix": "GE_ADD", "category": "一般教養", "subcategory": subs_ge[i%6], "count": 25, "guidelines": "大人の常識・時事・政治経済・ITインフラ・歴史常識（雑学除外）。", "default_source": "現代教養"})
        b += 1
    return tasks

async def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("エラー: GEMINI_API_KEY が設定されていません。", flush=True)
        return

    client = genai.Client(api_key=api_key)
    tasks = build_tasks()
    completed_ids = get_completed_batch_ids()
    print(f"全タスク数: {len(tasks)} / 生成済み: {len(completed_ids)} バッチ", flush=True)

    # 同時並行数を 4 に設定
    sem = asyncio.Semaphore(4)
    await asyncio.gather(*(generate_task(client, t, sem, completed_ids) for t in tasks))

    # 完了後、単一の整形済み JSON に変換
    if os.path.exists(OUTPUT_FILE):
        records = []
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    item.pop("_batch_id", None)
                    records.append(item)
        with open("generated_quiz_all.json", "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f"\n★ 全工程完了！ generated_quiz_all.json に {len(records)} 問を統合保存しました。", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

