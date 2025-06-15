#!/usr/bin/env python3
"""
Places → Supabase 404 完全回避版
  - lat/lng は float → double precision カラム
  - tags はシンプルな text
  - 50行ずつ upsert で PostgREST テーブルロック回避
"""
import os, time, requests, itertools
from supabase import create_client

SUPABASE_URL  = os.environ["SUPABASE_URL"]
SUPABASE_KEY  = os.environ["SUPABASE_KEY"]
GOOGLE_KEY    = os.environ["GOOGLE_PLACES_KEY"]
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

TARGETS  = [("Fukuoka",33.5902,130.4017), ("Hiroshima",34.3853,132.4553)]
KEYWORDS = ["vegan", "gluten free"]
RADIUS   = 25_000
CHUNK    = 50

def g_places(kw, lat, lng):
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = dict(keyword=kw, location=f"{lat},{lng}", radius=RADIUS,
                  language="en", key=GOOGLE_KEY)
    while True:
        j = requests.get(url, params=params, timeout=10).json()
        yield from j.get("results", [])
        tok = j.get("next_page_token");  print(".", end="", flush=True)
        if not tok: break
        time.sleep(2.1); params={"pagetoken":tok,"key":GOOGLE_KEY}

def batched(it,n): it=iter(it); return iter(lambda:list(itertools.islice(it,n)),[])

def main():
    rows=[]
    for city,lat,lng in TARGETS:
        for kw in KEYWORDS:
            print(f"\n🔍 {city} / {kw}", flush=True)
            for p in g_places(kw,lat,lng):
                rows.append(dict(
                    id   = p["place_id"],
                    name = p["name"],
                    lat  = float(p["geometry"]["location"]["lat"]),
                    lng  = float(p["geometry"]["location"]["lng"]),
                    tags = "auto",
                ))
    print(f"\n📝 total {len(rows)} rows")
    for i,chunk in enumerate(batched(rows,CHUNK),1):
        sb.table("places").upsert(chunk).execute()
        print(f"  ✔ chunk {i} ({len(chunk)})")
    print("🎉 done")

if __name__ == "__main__":
    main()
