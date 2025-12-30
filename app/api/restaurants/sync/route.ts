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

// Helper to check if text contains Japanese characters (Hiragana, Katakana, Kanji)
function containsJapanese(text: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

// Analyze reviews for Local Ratio and Honest Summary
function analyzeReviews(reviews: any[]) {
    if (!reviews || reviews.length === 0) return { localRatio: 0, summary: null };

    let japaneseCount = 0;
    const pros: string[] = [];
    const cons: string[] = [];
    const tips: string[] = [];

    // Simple rule-based extraction patterns (can be improved with LLM later)
    const positivePatterns = [
        /(?:delicious|amazing|great|best|excellent|tasty) ([a-zA-Z\s]+)/i,
        /([a-zA-Z\s]+) (?:was|is) (?:delicious|amazing|great|best|excellent|tasty)/i
    ];
    const negativePatterns = [
        /(?:bad|slow|expensive|noisy|small|wait) ([a-zA-Z\s]+)/i,
        /([a-zA-Z\s]+) (?:was|is) (?:bad|slow|expensive|noisy|small|wait)/i,
        /(?:too) (?:salty|sweet|spicy|expensive|crowded)/i
    ];
    const tipPatterns = [
        /(?:go|visit|try) (?:before|after|at) ([0-9apm\s]+)/i,
        /(?:reservation|booking) (?:is|was) (?:required|recommended)/i,
        /(?:ask|order|try) (?:for)? the ([a-zA-Z\s]+)/i
    ];

    reviews.forEach(review => {
        const text = review.text || '';
        if (containsJapanese(text)) {
            japaneseCount++;
        }

        // Extract Pros/Cons/Tips (English only for V1 simple regex)
        // Note: For Japanese analysis we'd need MeCab or similar, skipping for V1 regex
        if (!containsJapanese(text)) {
            positivePatterns.forEach(p => {
                const match = text.match(p);
                if (match) pros.push(match[0]); // extraction might be too long, keeping simple
            });
            negativePatterns.forEach(p => {
                const match = text.match(p);
                if (match) cons.push(match[0]);
            });
            tipPatterns.forEach(p => {
                const match = text.match(p);
                if (match) tips.push(match[0]);
            });
        }
    });

    // Clean up extracted phrases (dedupe and limit)
    const uniquePros = Array.from(new Set(pros)).slice(0, 3);
    const uniqueCons = Array.from(new Set(cons)).slice(0, 3);
    const uniqueTips = Array.from(new Set(tips)).slice(0, 3);

    return {
        localRatio: japaneseCount / reviews.length,
        summary: (uniquePros.length > 0 || uniqueCons.length > 0) ? {
            pros: uniquePros,
            cons: uniqueCons,
            tips: uniqueTips
        } : null
    };
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
        halal: allText.includes('halal') || allText.includes('ハラル'),
        kosher: allText.includes('kosher')
    };
}

interface MenuItem {
    name: string;
    count: number;
    sentiment: number; // Simple indicator based on rating of review
}

function extractRealMenu(reviews: any[]): MenuItem[] {
    if (!reviews || !Array.isArray(reviews)) return [];

    const menuCandidates = new Map<string, { count: number; totalRating: number }>();

    // Simple patterns to catch food names
    // EN: "the [Food] was", "ate [Food]", "ordered [Food]"
    const enPatterns = [
        /(?:the|a)\s+([a-zA-Z\s]+?)\s+(?:was|is)\s+(?:delicious|good|great|amazing|tasty|excellent)/i,
        /(?:ordered|ate|had|tried)\s+(?:the\s+)?([a-zA-Z\s]+?)(?:\.|,|!|\s+and|\s+was)/i,
        /(?:recommend|suggest)\s+(?:the\s+)?([a-zA-Z\s]+?)(?:\.|,|!)/i
    ];

    // JA: "「[料理]」が", "[料理]を食べました", "[料理]が美味しかった"
    // Note: Japanese matching is harder without tokenization, so we rely on explicit brackets or simple particles
    const jaPatterns = [
        /「(.+?)」(?:\s*が|\s*を)/,
        /([^、。!?\s]+?)(?:が|は)(?:美味|おい|うま)/, // [Food] was delicious
        /([^、。!?\s]+?)(?:を)(?:注文|頼|食|いただ)/ // Ordered/Ate [Food]
    ];

    // Blocklist for common non-food words captured by simple regex
    const stopWords = new Set([
        'it', 'that', 'this', 'everything', 'staff', 'service', 'place', 'atmosphere', 'price',
        'dinner', 'lunch', 'breakfast', 'meal', 'food', 'restaurant', 'option', 'menu', 'vegan', 'vegetarian',
        '店', '雰囲気', 'スタッフ', '接客', '値段', '価格', '全て', 'これ', 'それ', 'ここ', '料理', '食事'
    ]);

    for (const review of reviews) {
        const text = review.text || '';
        const rating = review.rating || 3;

        // Process English matches
        for (const pattern of enPatterns) {
            const matches = text.match(new RegExp(pattern, 'g'));
            if (matches) {
                matches.forEach((matchStr: string) => {
                    const capture = matchStr.match(pattern)?.[1]?.trim().toLowerCase();
                    if (capture && capture.length > 2 && capture.length < 30 && !stopWords.has(capture)) {
                        // Clean up "best" "amazing" prefixes if captured
                        const cleanName = capture.replace(/^(?:best|amazing|delicious|great)\s+/, '');

                        const current = menuCandidates.get(cleanName) || { count: 0, totalRating: 0 };
                        menuCandidates.set(cleanName, {
                            count: current.count + 1,
                            totalRating: current.totalRating + rating
                        });
                    }
                });
            }
        }

        // Process Japanese matches
        for (const pattern of jaPatterns) {
            const matches = text.match(new RegExp(pattern, 'g'));
            if (matches) {
                matches.forEach((matchStr: string) => {
                    const capture = matchStr.match(pattern)?.[1]?.trim();
                    if (capture && capture.length > 1 && capture.length < 20 && !stopWords.has(capture)) {
                        const current = menuCandidates.get(capture) || { count: 0, totalRating: 0 };
                        menuCandidates.set(capture, {
                            count: current.count + 1,
                            totalRating: current.totalRating + rating
                        });
                    }
                });
            }
        }
    }

    // Convert map to array and sort
    return Array.from(menuCandidates.entries())
        .map(([name, data]) => ({
            name: name.replace(/\b\w/g, l => l.toUpperCase()), // Title Case for EN
            count: data.count,
            sentiment: data.totalRating / data.count
        }))
        .filter(item => item.count >= 1) // Keep everything for now, can filter by count > 1 for stricter threshold
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Top 8 items
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
            fields: 'name,formatted_address,geometry,opening_hours,photos,reviews,rating,user_ratings_total,price_level,formatted_phone_number,url',
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
        // Analyze reviews
        const { localRatio, summary } = analyzeReviews(place.reviews || []);

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
            price_level: place.price_level,
            phone_number: place.formatted_phone_number,
            google_maps_uri: place.url,
            website: place.website,
            real_menu: extractRealMenu(place.reviews),
            local_ratio: localRatio,
            ai_summary: summary,
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
