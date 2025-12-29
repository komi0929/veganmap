import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';
const SYNC_THRESHOLD_HOURS = 72;

// Keywords for review mining
const REVIEW_KEYWORDS = [
    'vegan', 'vegetarian', 'gluten', 'meat', 'dashi', 'egg', 'milk',
    'friendly', 'english menu', 'halal', 'kosher', 'allergy', 'organic',
    'plant-based', 'dairy-free', 'nut-free', 'soy-free', 'no msg'
];

interface ReviewSnippet {
    text: string;
    rating: number;
    keywords: string[];
}

function extractReviewSnippets(reviews: any[]): ReviewSnippet[] {
    if (!reviews || !Array.isArray(reviews)) return [];

    const matchingReviews: ReviewSnippet[] = [];

    for (const review of reviews) {
        const text = review.text?.toLowerCase() || '';
        const matchedKeywords = REVIEW_KEYWORDS.filter(kw => text.includes(kw));

        if (matchedKeywords.length > 0) {
            // Extract relevant sentence containing keyword
            const sentences = review.text.split(/[.!?]/);
            const relevantSentences = sentences.filter((s: string) =>
                matchedKeywords.some(kw => s.toLowerCase().includes(kw))
            );

            matchingReviews.push({
                text: relevantSentences.slice(0, 2).join('. ').trim() || review.text.slice(0, 200),
                rating: review.rating,
                keywords: matchedKeywords
            });
        }
    }

    // Return top 3 most relevant (highest keyword matches)
    return matchingReviews
        .sort((a, b) => b.keywords.length - a.keywords.length)
        .slice(0, 3);
}

function prioritizePhotos(photos: any[]): string[] {
    if (!photos || !Array.isArray(photos)) return [];

    // Prioritize photos with food/interior in their metadata if available
    // Otherwise return first 5 photos
    return photos
        .slice(0, 5)
        .map(p => p.photo_reference);
}

function inferDietaryTags(reviews: any[], name: string): Record<string, boolean> {
    const allText = [
        name.toLowerCase(),
        ...(reviews || []).map((r: any) => r.text?.toLowerCase() || '')
    ].join(' ');

    return {
        oriental_vegan: allText.includes('no garlic') || allText.includes('no onion') || allText.includes('五葷'),
        alcohol_free: allText.includes('no alcohol') || allText.includes('alcohol-free') || allText.includes('halal'),
        nut_free: allText.includes('nut-free') || allText.includes('no nuts'),
        soy_free: allText.includes('soy-free') || allText.includes('no soy'),
        halal: allText.includes('halal'),
        kosher: allText.includes('kosher')
    };
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { restaurantId, forceSync = false } = body;

    if (!restaurantId) {
        return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    // Create server-side Supabase client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
        // Get current restaurant data
        const { data: restaurant, error: fetchError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();

        if (fetchError || !restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        // Check if sync is needed
        const lastSynced = restaurant.last_synced_at ? new Date(restaurant.last_synced_at) : null;
        const hoursSinceSync = lastSynced
            ? (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60)
            : Infinity;

        const needsSync = forceSync || hoursSinceSync > SYNC_THRESHOLD_HOURS;

        if (!needsSync) {
            return NextResponse.json({
                synced: false,
                message: 'Data is fresh',
                restaurant
            });
        }

        // Fetch fresh data from Google Places API
        const placeId = restaurant.google_place_id;
        const params = new URLSearchParams({
            place_id: placeId,
            fields: 'name,formatted_address,geometry,opening_hours,photos,reviews,rating,user_ratings_total',
            key: apiKey,
            language: 'ja'
        });

        const response = await fetch(`${GOOGLE_PLACES_API_URL}/details/json?${params}`);
        const data = await response.json();

        if (data.status !== 'OK') {
            console.error('Google Places API error:', data.status);
            return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 500 });
        }

        const place = data.result;

        // Extract review snippets (Review Mining)
        const cachedReviews = extractReviewSnippets(place.reviews);

        // Prioritize photos (Photo Curation)
        const curatedPhotos = prioritizePhotos(place.photos);

        // Infer dietary tags from reviews and name
        const inferredTags = inferDietaryTags(place.reviews, place.name);

        // Merge inferred tags with existing tags
        const existingTags = restaurant.dietary_tags || {};
        const mergedTags = { ...existingTags };
        for (const [key, value] of Object.entries(inferredTags)) {
            if (value === true) {
                mergedTags[key] = true;
            }
        }

        // Update restaurant in database
        const updateData = {
            name: place.name || restaurant.name,
            address: place.formatted_address || restaurant.address,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            opening_hours: place.opening_hours?.weekday_text || null,
            photos: curatedPhotos,
            cached_reviews: cachedReviews,
            dietary_tags: mergedTags,
            last_synced_at: new Date().toISOString()
        };

        const { data: updatedRestaurant, error: updateError } = await supabase
            .from('restaurants')
            .update(updateData)
            .eq('id', restaurantId)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return NextResponse.json({ error: 'Failed to update restaurant' }, { status: 500 });
        }

        return NextResponse.json({
            synced: true,
            message: 'Data synchronized successfully',
            restaurant: updatedRestaurant
        });

    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}
