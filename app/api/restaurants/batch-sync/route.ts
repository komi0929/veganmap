import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

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

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get all restaurants without photos
    const { data: restaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, google_place_id, name, photos')
        .or('photos.is.null,photos.eq.{}');

    if (fetchError || !restaurants) {
        return NextResponse.json({ error: 'Failed to fetch restaurants', details: fetchError }, { status: 500 });
    }

    console.log(`Found ${restaurants.length} restaurants without photos`);

    const results = {
        total: restaurants.length,
        synced: 0,
        failed: 0,
        errors: [] as string[]
    };

    // Process each restaurant (with rate limiting)
    for (const restaurant of restaurants.slice(0, 50)) { // Limit to 50 per batch
        try {
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
                console.error(`Failed for ${restaurant.name}:`, data.status);
                results.failed++;
                results.errors.push(`${restaurant.name}: ${data.status}`);
                continue;
            }

            const place = data.result;
            const photos = (place.photos || []).slice(0, 5).map((p: any) => p.photo_reference);

            if (photos.length === 0) {
                console.log(`No photos for ${restaurant.name}`);
                results.failed++;
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
                console.error(`Update failed for ${restaurant.name}:`, updateError);
                results.failed++;
                results.errors.push(`${restaurant.name}: Update failed`);
            } else {
                console.log(`Synced ${restaurant.name}: ${photos.length} photos`);
                results.synced++;
            }

            // Rate limiting: 300ms between requests
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.error(`Error syncing ${restaurant.name}:`, error);
            results.failed++;
            results.errors.push(`${restaurant.name}: ${error}`);
        }
    }

    return NextResponse.json({
        success: true,
        message: `Batch sync completed`,
        results
    });
}
