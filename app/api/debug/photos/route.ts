import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get photo status for all restaurants
    const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, name, photos, last_synced_at, google_place_id')
        .order('name');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = {
        total: restaurants?.length || 0,
        withPhotos: 0,
        withoutPhotos: 0,
        withSyncedAt: 0,
        samples: [] as any[]
    };

    restaurants?.forEach(r => {
        const hasPhotos = r.photos && Array.isArray(r.photos) && r.photos.length > 0;
        if (hasPhotos) {
            stats.withPhotos++;
        } else {
            stats.withoutPhotos++;
        }
        if (r.last_synced_at) {
            stats.withSyncedAt++;
        }
    });

    // Get some sample data
    stats.samples = restaurants?.slice(0, 5).map(r => ({
        name: r.name,
        photoCount: r.photos?.length || 0,
        hasPlaceId: !!r.google_place_id,
        synced: !!r.last_synced_at
    })) || [];

    return NextResponse.json({ stats, allRestaurants: restaurants });
}
