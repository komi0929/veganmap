scripts/fetch_places.py
# scripts/fetch_places.py
import os, time, requests
from urllib.parse import urlencode
from supabase import create_client, Client

SUPABASE_URL  = os.getenv("SUPABASE_URL")
SUPABASE_KEY  = os.getenv("SUPABASE_KEY")
PLACES_KEY    = os.getenv("GOOGLE_PLACES_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 福岡市・広島市中心座標 & 半径 25km
TARGETS = [
    {"city": "Fukuoka",  "lat": 33.5902, "lng": 130.4017},
    {"city": "Hiroshima","lat": 34.3853, "lng": 132.4553},
]

KEYWORDS = ["vegan", '"gluten free"']

def search_places(keyword, lat, lng):
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "keyword": keyword,
        "location": f"{lat},{lng}",
        "radius": 25000,   # metres
        "language": "en",
        "key": PLACES_KEY
    }
    while True:
        res = requests.get(url, params=params).json()
        for p in res.get("results", []):
            yield p
        next_page = res.get("next_page_token")
        if not next_page: break
        time.sleep(2)             # token 有効化待ち
        params["pagetoken"] = next_page

def place_to_row(p):
    return {
        "id": p["place_id"],
        "name": p["name"],
        "lat":  p["geometry"]["location"]["lat"],
        "lng":  p["geometry"]["location"]["lng"],
        "tags": "auto"            # あとで GPT で詳細付与
    }

def main():
    seen = set()
    rows = []
    for tgt in TARGETS:
        for kw in KEYWORDS:
            for place in search_places(kw, tgt["lat"], tgt["lng"]):
                if place["place_id"] in seen: continue
                seen.add(place["place_id"])
                rows.append(place_to_row(place))
    print(f"Upserting {len(rows)} places …")
    supabase.table("places").upsert(rows).execute()
    print("Done.")

if __name__ == "__main__":
    main()
