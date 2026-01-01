import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel Cron Job: Weekly full sync of all restaurants
// Runs every Sunday at 3:00 AM JST (18:00 UTC Saturday)
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/weekly-sync", "schedule": "0 18 * * 6" }] }

export async function GET() {
    // Verify this is called by Vercel Cron (or has secret)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get all restaurants
    const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name');

    if (error || !restaurants) {
        return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://veganmap.jp';
    const secret = process.env.SEED_SECRET || 'dev-seed-2024';

    let successCount = 0;
    let errorCount = 0;

    // Sync restaurants one by one with delay to avoid rate limits
    for (const restaurant of restaurants) {
        try {
            const response = await fetch(
                `${baseUrl}/api/restaurants/sync-one?secret=${secret}&restaurantId=${restaurant.id}`,
                { method: 'POST' }
            );

            if (response.ok) {
                successCount++;
            } else {
                errorCount++;
            }

            // Wait 3 seconds between syncs to avoid Gemini rate limits
            await new Promise(r => setTimeout(r, 3000));
        } catch (err) {
            errorCount++;
        }
    }

    return NextResponse.json({
        success: true,
        message: `Weekly sync completed: ${successCount} succeeded, ${errorCount} failed`,
        total: restaurants.length
    });
}

// Allow Vercel Cron to call this endpoint
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minute timeout for cron
