import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get ALL restaurants with ALL fields
    const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name')
        .limit(100);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Summarize data completeness
    const summary = restaurants?.map(r => ({
        name: r.name,
        hasPhotos: !!(r.photos && r.photos.length > 0),
        photoCount: r.photos?.length || 0,
        hasRealMenu: !!(r.real_menu && r.real_menu.length > 0),
        realMenuCount: r.real_menu?.length || 0,
        hasAiSummary: !!(r.ai_summary && r.ai_summary.pros?.length > 0),
        aiSummaryCount: r.ai_summary?.pros?.length || 0,
        hasVibeTags: !!(r.vibe_tags && r.vibe_tags.length > 0),
        vibeTagsCount: r.vibe_tags?.length || 0,
        hasOpeningHours: !!(r.opening_hours && r.opening_hours.length > 0),
        hasPhoneNumber: !!r.phone_number,
        hasRating: !!r.rating,
        hasPriceLevel: r.price_level !== null && r.price_level !== undefined,
        hasGoogleMapsUri: !!r.google_maps_uri,
        hasDietaryTags: !!(r.dietary_tags && Object.keys(r.dietary_tags).length > 0),
        tags: r.tags
    }));

    return NextResponse.json({
        restaurants: restaurants,
        summary: summary
    });
}
