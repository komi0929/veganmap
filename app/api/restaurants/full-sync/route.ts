import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Full-sync: Delegate to sync-one for each restaurant (ensures consistent behavior)
export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get all restaurants
    const { data: restaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name')
        .limit(limit);

    if (fetchError || !restaurants) {
        return NextResponse.json({ error: 'Failed to fetch restaurants', details: fetchError?.message }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://veganmap.jp';
    const results = {
        total: restaurants.length,
        synced: 0,
        errors: [] as string[],
        details: [] as { name: string; success: boolean; data?: any }[]
    };

    // Process each restaurant using sync-one
    for (const restaurant of restaurants) {
        try {
            const response = await fetch(
                `${baseUrl}/api/restaurants/sync-one?secret=${secret}&restaurantId=${restaurant.id}`,
                { method: 'POST' }
            );

            const data = await response.json();

            if (data.success) {
                results.synced++;
                results.details.push({
                    name: restaurant.name,
                    success: true,
                    data: data.data
                });
            } else {
                results.errors.push(`${restaurant.name}: ${data.error}`);
                results.details.push({
                    name: restaurant.name,
                    success: false
                });
            }

            // Rate limiting: 2 seconds between each sync-one call
            await new Promise(r => setTimeout(r, 2000));

        } catch (error: any) {
            results.errors.push(`${restaurant.name}: ${error.message}`);
            results.details.push({
                name: restaurant.name,
                success: false
            });
        }
    }

    return NextResponse.json({
        success: true,
        message: `Full sync completed: ${results.synced}/${results.total} restaurants`,
        results
    });
}

// Increase timeout for this endpoint
export const maxDuration = 300; // 5 minutes
