import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Dish Search API: Find all restaurants serving a specific dish
// Example: /api/search/dishes?q=ramen → returns all restaurants with ramen on menu

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim();
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
        return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch all restaurants with real_menu data
    const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, name, address, rating, photos, real_menu, tags, vibe_tags, inbound_scores, latitude, longitude')
        .not('real_menu', 'is', null)
        .limit(100);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter restaurants that have matching dish in real_menu
    const matchingRestaurants = (restaurants || [])
        .map(restaurant => {
            const menuItems = (restaurant.real_menu as any[]) || [];
            const matchingDishes = menuItems.filter(item =>
                item.name?.toLowerCase().includes(query)
            );

            if (matchingDishes.length === 0) return null;

            return {
                ...restaurant,
                matchingDishes: matchingDishes.map(d => d.name),
                matchCount: matchingDishes.length
            };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.matchCount - a.matchCount)
        .slice(0, limit);

    // Also search for partial matches in restaurant tags
    const tagMatches = (restaurants || [])
        .filter(r => {
            const tags = (r.tags as string[]) || [];
            return tags.some(tag => tag.toLowerCase().includes(query));
        })
        .filter(r => !matchingRestaurants.find((m: any) => m?.id === r.id))
        .slice(0, 5);

    return NextResponse.json({
        success: true,
        query,
        totalMatches: matchingRestaurants.length,
        results: matchingRestaurants,
        relatedByTags: tagMatches.map(r => ({
            id: r.id,
            name: r.name,
            matchedTag: (r.tags as string[])?.find(t => t.toLowerCase().includes(query))
        }))
    });
}
