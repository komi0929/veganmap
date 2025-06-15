# scripts/fetch_places.py
#
# Google Places API から「vegan」「gluten free」等で検索し、
# Supabase の places テーブル(text[] 型) に upsert するスクリプト
#
# ❶ 必要な環境変数（Vercel の Environment Variables で設定）
#    - SUPABASE_URL
#    - SUPABASE_KEY      … service_role ではなく anon で OK
#    - GOOGLE_PLACES_KEY … 有効化済みの Google Maps API Key
#
# ❷ cron で毎日／手動 GitHub Actions で呼び出す想定

import os
import time
import requests
from urllib.parse import urlencode
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
PLACES_KEY   = os.getenv("GOOGLE_PLACES_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, PLACES_KEY]):
    raise RuntimeError("環境変数 SUPABASE_URL / SUPABASE_KEY / GOOGLE_PLACES_KEY が不足しています")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ======== 設定 ======== #
TARGETS = [
    {"city": "Fukuoka",   "lat": 33.5902, "lng": 130.4017},
    {"city": "Hiroshima", "lat": 34.3853, "lng": 132.4553},
]
KEYWORDS = ["vegan", "gluten free"]
RADIUS_METERS = 25_000  # Google Places API の半径上限
DELAY_BETWEEN_CALLS = 2  # 秒（rate-limit 緩和用）
# ====================== #

def search_places(keyword: str, lat: float, lng: float) -> list[dict]:
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "keyword":  keyword,
        "location": f"{lat},{lng}",
        "radius":   RADIUS_METERS,
        "language": "en",
        "key":      PLACES_KEY,
    }

    results: list[dict] = []
    while True:
        res = requests.get(url, params=params).json()

        # デバッグ用：最初のページのみ生 JSON を標準出力
        if not results:
            print("===== GOOGLE RAW JSON =====")
            print(res)
            print("===== END =====")

        if res.get("status") != "OK":
            break

        results.extend(res["results"])
        next_token = res.get("next_page_token")
        if not next_token:
            break

        # 次ページ取得は短い待機が必要
        time.sleep(DELAY_BETWEEN_CALLS)
        params = {"pagetoken": next_token, "key": PLACES_KEY}

    return results


def main() -> None:
    rows: list[dict] = []

    for target in TARGETS:
        city, lat, lng = target["city"], target["lat"], target["lng"]

        for kw in KEYWORDS:
            print(f"★ {city} / {kw}")
            places = search_places(kw, lat, lng)

            for p in places:
                place_id = p["place_id"]
                name     = p["name"]
                lat_p    = p["geometry"]["location"]["lat"]
                lng_p    = p["geometry"]["location"]["lng"]

                # Postgres 配列 text[] は {"val1","val2"} という文字列で送る
                row = {
                    "id":   place_id,
                    "name": name,
                    "lat":  lat_p,
                    "lng":  lng_p,
                    "tags": "{auto}",      # 今は自動取得なので固定タグ
                }
                rows.append(row)
                print(f"   └ got: {name}")

    print(f"合計 rows: {len(rows)}")
    if not rows:
        print("No places found. Check API key / quota / keywords.")
        return

    print(f"Upserting {len(rows)} places …")
    supabase.table("places").upsert(rows).execute()
    print("Done.")


if __name__ == "__main__":
    main()
