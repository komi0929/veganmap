import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Phase 4: Passive Tagging - Log search queries and clicks
export async function POST(request: NextRequest) {
    try {
        const { query, clickedRestaurantId, sessionId } = await request.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Insert search log
        const { error } = await (supabase as any)
            .from('search_logs')
            .insert({
                query,
                clicked_restaurant_id: clickedRestaurantId || null,
                session_id: sessionId || null
            });

        if (error) {
            console.error('Search log error:', error);
            return NextResponse.json({ error: 'Failed to log search' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Get popular search tags for a restaurant
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
        return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get queries that led to clicks on this restaurant
    const { data, error } = await supabase
        .from('search_logs')
        .select('query')
        .eq('clicked_restaurant_id', restaurantId)
        .not('query', 'is', null);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Count query frequency
    const queryCounts = new Map<string, number>();
    (data || []).forEach(log => {
        const q = log.query.toLowerCase().trim();
        queryCounts.set(q, (queryCounts.get(q) || 0) + 1);
    });

    // Return top 5 tags
    const tags = Array.from(queryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({ tags });
}
