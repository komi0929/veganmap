import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Locations to search (Japan major cities)
const SEARCH_LOCATIONS = [
    { name: '東京', lat: 35.6762, lng: 139.6503 },
    { name: '大阪', lat: 34.6937, lng: 135.5023 },
    { name: '京都', lat: 35.0116, lng: 135.7681 },
    { name: '福岡', lat: 33.5904, lng: 130.4017 },
    { name: '名古屋', lat: 35.1815, lng: 136.9066 },
    { name: '札幌', lat: 43.0618, lng: 141.3545 },
    { name: '神戸', lat: 34.6901, lng: 135.1956 },
    { name: '横浜', lat: 35.4437, lng: 139.6380 },
];

const SEARCH_QUERIES = [
    'vegan restaurant',
    'vegetarian restaurant',
    'ビーガン レストラン',
    'ベジタリアン 料理',
];

interface PlaceResult {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
}

async function searchPlaces(query: string, lat: number, lng: number, apiKey: string): Promise<PlaceResult[]> {
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.set('query', query);
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', '25000');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'ja');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', data.status, data.error_message);
        return [];
    }

    return data.results || [];
}

function inferTags(place: PlaceResult, query: string): string[] {
    const tags: string[] = [];
    const nameLower = place.name.toLowerCase();
    const queryLower = query.toLowerCase();

    if (queryLower.includes('vegan') || nameLower.includes('vegan') || nameLower.includes('ビーガン')) {
        tags.push('vegan');
    }
    if (queryLower.includes('vegetarian') || nameLower.includes('vegetarian') || nameLower.includes('ベジタリアン')) {
        tags.push('vegetarian');
    }
    if (nameLower.includes('organic') || nameLower.includes('オーガニック')) {
        tags.push('organic');
    }
    if (place.types?.includes('cafe') || nameLower.includes('cafe') || nameLower.includes('カフェ')) {
        tags.push('cafe');
    }
    if (nameLower.includes('gluten') || nameLower.includes('グルテン')) {
        tags.push('gluten-free');
    }

    if (tags.length === 0) {
        tags.push('vegetarian');
    }

    return [...new Set(tags)];
}

export async function POST(request: NextRequest) {
    // Security check - only allow with correct secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!apiKey || !supabaseUrl || !supabaseKey) {
        return NextResponse.json({
            error: 'Missing environment variables',
            hasApiKey: !!apiKey,
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseKey: !!supabaseKey
        }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const allRestaurants: any[] = [];
    const seenPlaceIds = new Set<string>();
    const logs: string[] = [];

    for (const location of SEARCH_LOCATIONS) {
        logs.push(`📍 Searching in ${location.name}...`);

        for (const query of SEARCH_QUERIES) {
            try {
                const results = await searchPlaces(query, location.lat, location.lng, apiKey);
                logs.push(`  - "${query}": ${results.length} results`);

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
            } catch (error) {
                logs.push(`  - Error: ${error}`);
            }
        }
    }

    logs.push(`\n✅ Found ${allRestaurants.length} unique restaurants`);

    // Insert into Supabase
    let inserted = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const restaurant of allRestaurants) {
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
            errors.push(`${restaurant.name}: ${error.message}`);
        } else {
            inserted++;
        }
    }

    logs.push(`\n📤 Results:`);
    logs.push(`   Inserted: ${inserted}`);
    logs.push(`   Skipped: ${skipped}`);
    if (errors.length > 0) {
        logs.push(`   Errors: ${errors.length}`);
    }

    return NextResponse.json({
        success: true,
        totalFound: allRestaurants.length,
        inserted,
        skipped,
        errors: errors.slice(0, 10),
        logs
    });
}
