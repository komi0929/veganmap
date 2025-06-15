#!/usr/bin/env python3
"""
Google Places → Supabase (404 完全回避版)
- 1 レコードずつ upsert（404 バグ無視）
- 欠損値 / NaN / 重複 place_id すべて排除
"""

import os, time, requests
from supabase import create_client, Client

# -- 環境変数 --
sb: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
GKEY = os.getenv("GOOGLE_PLACES_KEY")

# -- 定数 --
TARGETS  = [("Fukuoka",33.5902,130.4017), ("Hiroshima",34.3853,132.4553)]
WORDS    = ["vegan", "gluten free"]
RADIUS   = 25_000
SLEEP    = 2.2       # next_page_token 待ち

# -- 関数 --
def g_places(word, lat, lng):
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    p   = dict(keyword=word, location=f"{lat},{lng}", radius=RADIUS,
               language="en", key=GKEY)
    while True:
        j = requests.get(url, params=p, timeout=10).json()
        if j.get("status") not in ("OK", "ZERO_RESULTS"):
            print("⚠️ Google:", j.get("status"), j.get("error_message")); break
        yield from j.get("results", [])
        tok = j.get("next_page_token")
        if not tok: break
        time.sleep(SLEEP)
        p = {"pagetoken": tok, "key": GKEY}

def safe_float(x):
    try: return float(x)
    except Exception: return None

# -- メイン --
def main():
    seen = set()
    ok   = 0
    for city,clat,clng in TARGETS:
        for w in WORDS:
            print(f"🔍 {city}/{w}")
            for p in g_places(w, clat, clng):
                pid = p.get("place_id")
                if not pid or pid in seen: continue
                seen.add(pid)

                row = dict(
                    id   = pid,
                    name = p.get("name") or "",
                    lat  = safe_float(p["geometry"]["location"].get("lat")),
                    lng  = safe_float(p["geometry"]["location"].get("lng")),
                    tags = "auto",
                )
                # 欠損値チェック (lat/lng 必須)
                if row["lat"] is None or row["lng"] is None: continue

                # 1 行ずつ upsert で確実に成功させる
                try:
                    sb.table("places").upsert(row).execute()
                    ok += 1
                except Exception as e:
                    print("⚠️ upsert error, skip:", e)

    print(f"🎉 完了 – upsert 成功 {ok} 件")

if __name__ == "__main__":
    main()
