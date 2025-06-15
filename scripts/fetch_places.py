"""
fetch_places.py
福岡・広島エリアで `vegan` / `gluten free` を Google Places API で検索し，
Supabase の `places` テーブルへ upsert する。
デバッグ用に Google から返った JSON をそのまま表示する機能付き。
"""

import os, time, json, requests
from supabase import create_client, Client

# ─────────── 環境変数 ────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
PLACES_KEY   = os.getenv("GOOGLE_PLACES_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─────────── 検索条件 ────────────
TARGETS = [
    {"city": "Fukuoka",  "lat": 33.5902, "lng": 130.4017},
    {"city": "Hiroshima","lat": 34.3853, "lng": 132.4553},
]
KEYWORDS = ["vegan", "gluten free"]
RADIUS   = 25000  # metres

# ─────────── デバッグ用 ───────────
def debug_google_response(res: dict):
    print("===== GOOGLE RAW JSON =====")
    print(json.dumps(res, indent=2)[:4000])   # 先頭 4000 文字だけ表示
    print("===== END =====")

# ───── Google Places API 呼び出し ─────
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
        debug_google_response(res)          # ←★ ここで生レスポンス表示
        for p in res.get("results", []):
            yield p
        token = res.get("next_page_token")
        if not token:
            break
        time.sleep(2)                       # token 有効化待ち
        params["pagetoken"] = token

# ───── Supabase に入れる行変換 ─────
def place_to_row(p):
    return {
        "id":   p["place_id"],
        "name": p["name"],
        "lat":  p["geometry"]["location"]["lat"],
        "lng":  p["geometry"]["location"]["lng"],
        "tags": "auto",
    }

# ─────────── メイン処理 ────────────
def main():
    seen, rows = set(), []
    for tgt in TARGETS:
        for kw in KEYWORDS:
            print(f"★ {tgt['city']} / {kw}")
            for place in search_places(kw, tgt["lat"], tgt["lng"]):
                print("   └ got:", place["name"])
                if not place.get("place_id") or place["place_id"] in seen:
                    continue
                seen.add(place["place_id"])
                rows.append(place_to_row(place))

    print("合計 rows:", len(rows))
    if not rows:
        print("No places found. Check API key / quota / keywords.")
        return

    print(f"Upserting {len(rows)} places …")
    supabase.table("places").upsert(rows).execute()
    print("Done.")

if __name__ == "__main__":
    main()
