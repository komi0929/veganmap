/**
 * Seed Restaurants from Google Places API
 * 
 * This script fetches real vegan/vegetarian restaurants from Google Places API
 * and inserts them into the Supabase database.
 * 
 * Usage: npx ts-node scripts/seed-from-google.ts
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Locations to search (Japan major cities)
const SEARCH_LOCATIONS = [
    { name: '東京', lat: 35.6762, lng: 139.6503 },
    { name: '大阪', lat: 34.6937, lng: 135.5023 },
    { name: '京都', lat: 35.0116, lng: 135.7681 },
    { name: '福岡', lat: 33.5904, lng: 130.4017 },
    { name: '名古屋', lat: 35.1815, lng: 136.9066 },
];

// Search queries
const SEARCH_QUERIES = [
    'vegan restaurant',
    'vegetarian restaurant',
    'organic cafe',
    'plant based food',
    'ビーガン レストラン',
    'ベジタリアン 料理',
];

interface PlaceResult {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
}

async function searchPlaces(query: string, lat: number, lng: number): Promise<PlaceResult[]> {
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.set('query', query);
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', '20000'); // 20km
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY!);
    url.searchParams.set('language', 'ja');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', data.status);
        return [];
    }

    return data.results || [];
}

function inferTags(place: PlaceResult, query: string): string[] {
    const tags: string[] = [];
    const nameLower = place.name.toLowerCase();
    const queryLower = query.toLowerCase();

    if (queryLower.includes('veg') || nameLower.includes('vegan')) {
        tags.push('vegan');
    }
    if (queryLower.includes('vegetarian') || nameLower.includes('vegetarian')) {
        tags.push('vegetarian');
    }
    if (queryLower.includes('organic') || nameLower.includes('organic')) {
        tags.push('organic');
    }
    if (place.types?.includes('cafe') || nameLower.includes('cafe') || nameLower.includes('カフェ')) {
        tags.push('cafe');
    }
    if (nameLower.includes('gluten') || nameLower.includes('グルテン')) {
        tags.push('gluten-free');
    }

    // Default tag if none inferred
    if (tags.length === 0) {
        tags.push('vegetarian');
    }

    return [...new Set(tags)];
}

async function insertToSupabase(restaurants: any[]) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    let inserted = 0;
    let skipped = 0;

    for (const restaurant of restaurants) {
        // Check if already exists
        const { data: existing } = await supabase
            .from('restaurants')
            .select('id')
            .eq('google_place_id', restaurant.google_place_id)
            .single();

        if (existing) {
            skipped++;
            continue;
        }

        const { error } = await supabase
            .from('restaurants')
            .insert(restaurant);

        if (error) {
            console.error('Insert error:', error.message);
        } else {
            inserted++;
        }
    }

    return { inserted, skipped };
}

async function main() {
    console.log('🌱 Seeding restaurants from Google Places API...\n');

    if (!GOOGLE_MAPS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing environment variables!');
        console.log('Required: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    const allRestaurants: any[] = [];
    const seenPlaceIds = new Set<string>();

    for (const location of SEARCH_LOCATIONS) {
        console.log(`📍 Searching in ${location.name}...`);

        for (const query of SEARCH_QUERIES) {
            const results = await searchPlaces(query, location.lat, location.lng);

            for (const place of results) {
                if (seenPlaceIds.has(place.place_id)) continue;
                seenPlaceIds.add(place.place_id);

                allRestaurants.push({
                    name: place.name,
                    google_place_id: place.place_id,
                    address: place.formatted_address,
                    latitude: place.geometry.location.lat,
                    longitude: place.geometry.location.lng,
                    rating: place.rating || null,
                    user_ratings_total: place.user_ratings_total || null,
                    tags: inferTags(place, query),
                    is_verified: false,
                    dietary_tags: {
                        oriental_vegan: false,
                        alcohol_free: false,
                        nut_free: false,
                        soy_free: false,
                        halal: false,
                        kosher: false
                    }
                });
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    console.log(`\n✅ Found ${allRestaurants.length} unique restaurants`);
    console.log('📤 Inserting into Supabase...\n');

    const { inserted, skipped } = await insertToSupabase(allRestaurants);

    console.log(`\n🎉 Done!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped (already exists): ${skipped}`);
}

main().catch(console.error);
