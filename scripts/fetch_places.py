#!/usr/bin/env python3
"""
Google Places API → Supabase `places` テーブルへ upsert する完全版スクリプト

● 依存
   - supabase-py >= 2.4
   - requests

● 必要な環境変数（Vercel / GitHub Actions の Env で設定）
   SUPABASE_URL
   SUPABASE_KEY          ← anon で OK（権限は RLS で制御）
   GOOGLE_PLACES_KEY     ← Maps Platform で「Places API」有効化済み

● テーブル定義（↑はもう出来ているはず）
   CREATE TABLE public.places (
       id   text PRIMARY KEY,
       name text,
       lat  numeric,
       lng  numeric,
       tags text[]
   );
   -- 例：RLS は anon ロール read-only にしておく
"""
from __future__ import annotations

import os
import time
from itertools import islice
from typing import Iterable, List, Dict

import requests
from supabase import create_client, Client

# ---------- 環境変数 ----------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GOOGLE_KEY   = os.getenv("GOOGLE_PLACES_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, GOOGLE_KEY]):
    raise SystemExit(
        "❌  環境変数 SUPABASE_URL / SUPABASE_KEY / GOOGLE_PLACES_KEY が不足しています"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------- 検索設定 ----------
TARGETS = [
    {"city": "Fukuoka",   "lat": 33.5902, "lng": 130.4017},
    {"city": "Hiroshima", "lat": 34.3853, "lng": 132.4553},
]
KEYWORDS = ["vegan", "gluten free"]
RADIUS   = 25_000          # m – Google Places の上限
SLEEP    = 2.2             # s – Google 推奨：次ページ取得間隔
CHUNK    = 50              # 件 – 50 件ずつ upsert（バグ回避）

# ---------- util ----------
def batched(iterable: Iterable, n: int) -> Iterable[List]:
    """iterable を n 個ずつのリストに切る"""
    it = iter(iterable)
    while (chunk := list(islice(it, n))):
        yield chunk


# ---------- Google API ----------
def google_nearby(keyword: str, lat: float, lng: float) -> List[Dict]:
    """Nearby Search を繰り返して一覧取得"""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = dict(
        keyword=keyword,
        location=f"{lat},{lng}",
        radius=RADIUS,
        language="en",
        key=GOOGLE_KEY,
    )
    results: List[Dict] = []

    while True:
        res = requests.get(url, params=params, timeout=10).json()

        if res.get("status") not in ("OK", "ZERO_RESULTS"):
            print("⚠️  Google API error:", res.get("status"), res.get("error_message"))
            break

        results.extend(res.get("results", []))

        next_token = res.get("next_page_token")
        if not next_token:
            break

        time.sleep(SLEEP)
        params = {"pagetoken": next_token, "key": GOOGLE_KEY}

    return results


# ---------- Main ----------
def main() -> None:
    rows: List[Dict] = []

    for target in TARGETS:
        city, lat_c, lng_c = target.values()
        for kw in KEYWORDS:
            print(f"🔍  {city} / {kw}")
            for p in google_nearby(kw, lat_c, lng_c):
                rows.append(
                    {
                        "id":   p["place_id"],                 # text
                        "name": p["name"],                     # text
                        "lat":  p["geometry"]["location"]["lat"],
                        "lng":  p["geometry"]["location"]["lng"],
                        "tags": ["auto"],                      # ← JSON array で送る
                    }
                )

    total = len(rows)
    if not total:
        print("😢  0 件でした。API Key / キーワードを確認してください")
        return

    print(f"📝  取得件数 {total} 件 → Supabase upsert 開始")

    for i, chunk in enumerate(batched(rows, CHUNK), start=1):
        supabase.table("places").upsert(chunk).execute()
        print(f"   ✔ Chunk {i}: {len(chunk)} rows")

    print("🎉  完了 – /places テーブルに upsert 済み")


if __name__ == "__main__":
    main()
