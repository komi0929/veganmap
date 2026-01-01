import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

interface AddRestaurantRequest {
    googlePlaceId?: string;
    searchQuery?: string;
    city?: string;
    tags?: string[];
}

// Search for places using Google Places API
async function searchPlaces(query: string, city: string, apiKey: string): Promise<any[]> {
    const params = new URLSearchParams({
        query: `${query} ${city}`,
        key: apiKey,
        language: 'ja'
    });

    const response = await fetch(`${GOOGLE_PLACES_API_URL}/textsearch/json?${params}`);
    const data = await response.json();

    if (data.status !== 'OK') {
        return [];
    }

    return data.results.slice(0, 10).map((place: any) => ({
        googlePlaceId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng
    }));
}

// Get place details
async function getPlaceDetails(placeId: string, apiKey: string): Promise<any | null> {
    const params = new URLSearchParams({
        place_id: placeId,
        fields: 'name,formatted_address,geometry,rating,user_ratings_total',
        key: apiKey,
        language: 'ja'
    });

    const response = await fetch(`${GOOGLE_PLACES_API_URL}/details/json?${params}`);
    const data = await response.json();

    if (data.status !== 'OK') {
        return null;
    }

    return {
        name: data.result.name,
        address: data.result.formatted_address,
        latitude: data.result.geometry?.location?.lat,
        longitude: data.result.geometry?.location?.lng,
        rating: data.result.rating,
        userRatingsTotal: data.result.user_ratings_total
    };
}

// Trigger sync for a restaurant (non-blocking)
async function triggerSync(restaurantId: string, baseUrl: string, secret: string): Promise<void> {
    // Fire and forget - don't await
    fetch(`${baseUrl}/api/restaurants/sync-one?secret=${secret}&restaurantId=${restaurantId}`, {
        method: 'POST'
    }).catch(err => console.error('Sync trigger failed:', err));
}

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const body: AddRestaurantRequest = await request.json();
    const { googlePlaceId, searchQuery, city, tags = ['vegan'] } = body;

    if (!googlePlaceId && !searchQuery) {
        return NextResponse.json({ error: 'Either googlePlaceId or searchQuery is required' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // If searchQuery is provided, search for places first
    if (searchQuery) {
        const places = await searchPlaces(searchQuery, city || '', apiKey);
        return NextResponse.json({
            success: true,
            action: 'search',
            results: places,
            message: 'Use googlePlaceId from results to add a specific restaurant'
        });
    }

    // Add restaurant by googlePlaceId
    if (googlePlaceId) {
        // Check if already exists
        const { data: existing } = await supabase
            .from('restaurants')
            .select('id, name')
            .eq('google_place_id', googlePlaceId)
            .single();

        if (existing) {
            // Trigger re-sync for existing restaurant
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://veganmap.jp';
            triggerSync(existing.id, baseUrl, secret);

            return NextResponse.json({
                success: true,
                action: 'resync',
                restaurant: existing,
                message: 'Restaurant already exists, sync triggered'
            });
        }

        // Get place details
        const details = await getPlaceDetails(googlePlaceId, apiKey);
        if (!details) {
            return NextResponse.json({ error: 'Invalid googlePlaceId' }, { status: 400 });
        }

        // Insert new restaurant
        const { data: newRestaurant, error: insertError } = await supabase
            .from('restaurants')
            .insert({
                google_place_id: googlePlaceId,
                name: details.name,
                address: details.address,
                latitude: details.latitude,
                longitude: details.longitude,
                rating: details.rating,
                user_ratings_total: details.userRatingsTotal,
                tags: tags,
                sync_status: 'pending',
                is_verified: false
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // Trigger auto-sync (fire and forget)
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://veganmap.jp';
        triggerSync(newRestaurant.id, baseUrl, secret);

        return NextResponse.json({
            success: true,
            action: 'created',
            restaurant: {
                id: newRestaurant.id,
                name: newRestaurant.name,
                address: newRestaurant.address
            },
            message: 'Restaurant added and sync triggered automatically'
        });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

// GET: Search for restaurants to add
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const query = searchParams.get('query');
    const city = searchParams.get('city') || '';

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!query) {
        return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const places = await searchPlaces(query, city, apiKey);

    return NextResponse.json({
        success: true,
        count: places.length,
        results: places
    });
}
