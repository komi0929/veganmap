#!/usr/bin/env python3
"""
Google Places → Supabase `places` テーブルへ upsert（重複完全排除版）
テーブル構造（5 列すべて NULL 可）:
    id   text primary key
    name text
    lat  double precision
    lng  double precision
    tags text
RLS は OFF または anon に INSERT/UPSERT 許可
"""

import os, time, requests, itertools
from supabase import create_client, Client

# -- 環境変数 --
sb: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"]
)
PLACES_KEY = os.environ["GOOGLE_PLACES_KEY"]

# -- 設定 --
TARGETS  = [("Fukuoka",33.5902,130.4017), ("Hiroshima",34.3853,132.4553)]
KEYWORDS = ["vegan", "gluten free"]
RADIUS   = 25_000
SLEEP    = 2.2         # next_page_token 有効化待ち
CHUNK    = 50

# -- utils --
def batched(it, n):
    it = iter(it)
    return iter(lambda: list(itertools.islice(it, n)), [])

def g_places(kw, lat, lng):
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = dict(keyword=kw, location=f"{lat},{lng}",
                  radius=RADIUS, language="en", key=PLACES_KEY)
    while True:
        j = requests.get(url, params=params, timeout=10).json()
        status = j.get("status")
        if status not in ("OK", "ZERO_RESULTS"):
            print("⚠️  Google API:", status, j.get("error_message")); break
        yield from j.get("results", [])
        tok = j.get("next_page_token")
        if not tok: break
        time.sleep(SLEEP)
        params = {"pagetoken": tok, "key": PLACES_KEY}

# -- main --
def main():
    seen = set()        # place_id 重複除外
    rows = []

    for city,clat,clng in TARGETS:
        for kw in KEYWORDS:
            print(f"🔍 {city} / {kw}")
            for p in g_places(kw, clat, clng):
                pid = p["place_id"]
                if pid in seen:        # ★重複をスキップ
                    continue
                seen.add(pid)
                rows.append(dict(
                    id   = pid,
                    name = p["name"],
                    lat  = float(p["geometry"]["location"]["lat"]),
                    lng  = float(p["geometry"]["location"]["lng"]),
                    tags = "auto",
                ))

    print(f"📝 unique rows = {len(rows)}")
    if not rows:
        print("😢 0 件 – API キー/キーワードを確認"); return

    for i,chunk in enumerate(batched(rows, CHUNK), 1):
        sb.table("places").upsert(chunk).execute()
        print(f"  ✔ chunk {i} ({len(chunk)})")

    print("🎉  done – 全件 upsert 済み")

if __name__ == "__main__":
    main()
