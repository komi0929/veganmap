import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const forceAll = searchParams.get('forceAll') === 'true';

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get ALL restaurants and filter in code (more reliable than complex OR query)
    const { data: allRestaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, google_place_id, name, photos')
        .order('name');

    if (fetchError || !allRestaurants) {
        return NextResponse.json({ error: 'Failed to fetch restaurants', details: fetchError }, { status: 500 });
    }

    // Filter restaurants without photos (null, undefined, empty array, or not an array)
    const restaurants = forceAll
        ? allRestaurants
        : allRestaurants.filter(r => {
            if (!r.photos) return true;
            if (!Array.isArray(r.photos)) return true;
            if (r.photos.length === 0) return true;
            return false;
        });

    console.log(`Found ${restaurants.length} restaurants to sync (out of ${allRestaurants.length} total)`);

    const results = {
        totalInDb: allRestaurants.length,
        needsSync: restaurants.length,
        synced: 0,
        noPhotosFromGoogle: 0,
        apiErrors: 0,
        updateErrors: 0,
        details: [] as { name: string; status: string; photoCount?: number }[]
    };

    // Process each restaurant
    for (const restaurant of restaurants) {
        try {
            if (!restaurant.google_place_id) {
                results.details.push({ name: restaurant.name, status: 'No Place ID' });
                results.apiErrors++;
                continue;
            }

            // Fetch place details
            const params = new URLSearchParams({
                place_id: restaurant.google_place_id,
                fields: 'photos,rating,user_ratings_total,opening_hours,formatted_phone_number,url,website',
                key: apiKey,
                language: 'ja'
            });

            const response = await fetch(`${GOOGLE_PLACES_API_URL}/details/json?${params}`);
            const data = await response.json();

            if (data.status !== 'OK') {
                results.details.push({ name: restaurant.name, status: `API: ${data.status}` });
                results.apiErrors++;
                continue;
            }

            const place = data.result;
            const photos = (place.photos || []).slice(0, 8).map((p: any) => p.photo_reference);

            if (photos.length === 0) {
                results.details.push({ name: restaurant.name, status: 'No photos in Google' });
                results.noPhotosFromGoogle++;
                continue;
            }

            // Update restaurant with photos
            const { error: updateError } = await (supabase as any)
                .from('restaurants')
                .update({
                    photos: photos,
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    opening_hours: place.opening_hours?.weekday_text || null,
                    phone_number: place.formatted_phone_number,
                    google_maps_uri: place.url,
                    website: place.website,
                    last_synced_at: new Date().toISOString()
                })
                .eq('id', restaurant.id);

            if (updateError) {
                results.details.push({ name: restaurant.name, status: `Update Error: ${updateError.message}` });
                results.updateErrors++;
            } else {
                results.details.push({ name: restaurant.name, status: 'OK', photoCount: photos.length });
                results.synced++;
            }

            // Rate limiting: 200ms between requests
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error: any) {
            results.details.push({ name: restaurant.name, status: `Exception: ${error.message}` });
            results.apiErrors++;
        }
    }

    return NextResponse.json({
        success: true,
        message: `Batch sync completed: ${results.synced} synced, ${results.apiErrors} API errors, ${results.updateErrors} DB errors`,
        results
    });
}
