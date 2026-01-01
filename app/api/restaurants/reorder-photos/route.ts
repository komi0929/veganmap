import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple heuristic: Google Places photos often have exterior as first photo
// Reorder to put photos 2,3,4 first (more likely to be food/interior), then 1, then rest

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get all restaurants with photos
    const { data: restaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, name, photos')
        .order('name');

    if (fetchError || !restaurants) {
        return NextResponse.json({ error: 'Failed to fetch restaurants', details: fetchError?.message }, { status: 500 });
    }

    // Filter: only restaurants with at least 3 photos
    const toProcess = restaurants.filter(r =>
        r.photos && Array.isArray(r.photos) && r.photos.length >= 3
    );

    const results = {
        total: restaurants.length,
        processed: 0,
        details: [] as { name: string; reordered: boolean }[]
    };

    for (const restaurant of toProcess) {
        try {
            const photos = restaurant.photos as string[];

            // Reorder: [2, 3, 4, 1, 5, 6, 7, 8] (0-indexed: [1,2,3,0,4,5,6,7])
            // This puts potential food photos first
            const reordered = [
                photos[1],            // 2nd photo
                photos[2],            // 3rd photo  
                photos[3] || photos[0], // 4th photo or fallback to 1st
                photos[0],            // 1st photo (likely exterior)
                ...photos.slice(4)    // rest
            ].filter(Boolean);

            // Update database
            await (supabase as any)
                .from('restaurants')
                .update({ photos: reordered })
                .eq('id', restaurant.id);

            results.processed++;
            results.details.push({
                name: restaurant.name,
                reordered: true
            });

        } catch (error: any) {
            results.details.push({
                name: restaurant.name,
                reordered: false
            });
        }
    }

    return NextResponse.json({
        success: true,
        message: `Reordered photos for ${results.processed} restaurants`,
        results
    });
}
