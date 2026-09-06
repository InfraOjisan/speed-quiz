async def generate_task(client, task, sem):
    async with sem:
        batch_id = task["batch_id"]
        category = task["category"]
        subcategory = task["subcategory"]
        count = task["count"]
        guidelines = task["guidelines"]

        prompt = f"""
あなたは高速クイズの作問エキスパートです。
以下の条件に従い、2択（Yes/No）クイズを正確に {count} 問作成してください。

【カテゴリ】{category}
【サブカテゴリ】{subcategory}
【詳細要件】
{guidelines}

【ルール】
1. 答えは Yes または No のいずれかで一意に決まる命題文（〜である。）にすること。
2. 直感で引っかかりやすい良問を中心にすること。
3. 解説は2〜3行で簡潔に記述すること。
4. id は "{task['id_prefix']}-{batch_id:03d}-" に連番を振ること。
5. 「エラー」「Error」「未定」といった文字列は含めないこと。
"""
        for retry in range(3):
            try:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model="gemini-1.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=SCHEMA,
                        temperature=0.7
                    )
                )
                items = json.loads(response.text)
                
                # バリデーション：必要なキーの存在と異常値のフィルタリング
                valid_items = []
                for item in items:
                    q = item.get("question", "")
                    exp = item.get("explanation", "")
                    
                    # 異常文字列の混入チェック
                    if "エラー" in q or "Error" in q or not q:
                        continue
                    
                    if "source" not in item or not item["source"]:
                        item["source"] = task.get("default_source", "")
                        
                    valid_items.append(item)

                print(f"[{task['id_prefix']} #{batch_id}] 完了: {len(valid_items)}問")
                return valid_items

            except Exception as e:
                print(f"[{task['id_prefix']} #{batch_id}] リトライ待機中 (試行 {retry+1}/3)...")
                await asyncio.sleep(3 * (retry + 1))

        return []

