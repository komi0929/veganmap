"""
fetch_places.py
Google Places API から
  - 福岡市 (半径 25km)
  - 広島市 (半径 25km)
の “vegan” と “gluten free” キーワードを検索し、
Supabase の `places` テーブルへ upsert するスクリプト。
"""

import os, time, requests
from supabase import create_client, Client

# ── 環境変数 ──────────────────────────────
SUPABASE_URL  = os.getenv("SUPABASE_URL")
SUPABASE_KEY  = os.getenv("SUPABASE_KEY")
PLACES_KEY    = os.getenv("GOOGLE_PLACES_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── 検索対象エリア ───────────────────────
TARGETS = [
    {"city": "Fukuoka",  "lat": 33.5902, "lng": 130.4017},
    {"city": "Hiroshima","lat": 34.3853, "lng": 132.4553},
]

KEYWORDS = ["vegan", "gluten free"]
RADIUS   = 25000   # 25km

# ── Google Places API 呼び出し関数 ───────
def search_places(keyword, lat, lng):
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "keyword": keyword,
        "location": f"{lat},{lng}",
        "radius": RADIUS,
        "language": "en",
        "key": PLACES_KEY,
    }
    while True:
        res = requests.get(url, params=params).json()
        for p in res.get("results", []):
            yield p
        next_token = res.get("next_page_token")
        if not next_token:
            break
        time.sleep(2)  # 次ページトークン有効化まで少し待つ
        params["pagetoken"] = next_token

# ── Supabase に登録する形へ変換 ───────────
def place_to_row(p):
    return {
        "id":  p["place_id"],
        "name": p["name"],
        "lat":  p["geometry"]["location"]["lat"],
        "lng":  p["geometry"]["location"]["lng"],
        "tags": "auto",
    }

# ── メイン処理 ───────────────────────────
def main():
    seen, rows = set(), []
    for tgt in TARGETS:
        for kw in KEYWORDS:
            print(f"★ {tgt['city']} / {kw}")            # 追加①
            for place in search_places(kw, tgt["lat"], tgt["lng"]):
                print("   └ got:", place["name"])       # 追加②
                if not place.get("place_id") or place["place_id"] in seen:
                    continue
                seen.add(place["place_id"])
                rows.append(place_to_row(place))

    print("合計 rows:", len(rows))                      # 追加③

    if not rows:                                        # 追加④
        print("No places found. Check API key / quota / keywords.")
        return

    print(f"Upserting {len(rows)} places …")
    supabase.table("places").upsert(rows).execute()
    print("Done.")

if __name__ == "__main__":
    main()
