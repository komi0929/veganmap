import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Places API (New) - v1 endpoints
const PLACES_API_BASE = 'https://places.googleapis.com/v1/places:searchText';

// Locations to search (Japan major cities)
// Locations to search (Restricted to Fukuoka for Phase 1)
const SEARCH_LOCATIONS = [
    { name: '福岡', lat: 33.5904, lng: 130.4017 },
];

const SEARCH_QUERIES = [
    'vegan restaurant',
    'vegetarian restaurant',
    'ビーガン レストラン',
    'ベジタリアン 料理',
];

interface PlaceResult {
    id: string;
    displayName: { text: string; languageCode: string };
    formattedAddress: string;
    location: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
    types?: string[];
}

async function searchPlacesNew(query: string, lat: number, lng: number, apiKey: string): Promise<PlaceResult[]> {
    const requestBody = {
        textQuery: query,
        locationBias: {
            circle: {
                center: { latitude: lat, longitude: lng },
                radius: 25000.0  // 25km
            }
        },
        languageCode: 'ja',
        maxResultCount: 20
    };

    try {
        const response = await fetch(PLACES_API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Places API error:', response.status, errorText);
            return [];
        }

        const data = await response.json();
        return data.places || [];
    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}

function inferTags(place: PlaceResult, query: string): string[] {
    const tags: string[] = [];
    const nameLower = place.displayName.text.toLowerCase();
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
                const results = await searchPlacesNew(query, location.lat, location.lng, apiKey);
                logs.push(`  - "${query}": ${results.length} results`);

                for (const place of results) {
                    if (seenPlaceIds.has(place.id)) continue;
                    seenPlaceIds.add(place.id);

                    allRestaurants.push({
                        name: place.displayName.text,
                        google_place_id: place.id,
                        address: place.formattedAddress,
                        latitude: place.location.latitude,
                        longitude: place.location.longitude,
                        rating: place.rating || null,
                        user_ratings_total: place.userRatingCount || null,
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
                await new Promise(resolve => setTimeout(resolve, 300));
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

        const { error } = await (supabase as any)
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
