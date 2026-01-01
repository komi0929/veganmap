import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

// Helper: Download image as Base64
async function downloadImageAsBase64(photoReference: string, apiKey: string): Promise<string | null> {
    try {
        const url = `${GOOGLE_PLACES_API_URL}/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch {
        return null;
    }
}

// Helper: Extract menu items from reviews
function extractRealMenu(reviews: any[]): { name: string; count: number; sentiment: number }[] {
    if (!reviews || !Array.isArray(reviews)) return [];

    const menuCandidates = new Map<string, { count: number; totalRating: number }>();

    const patterns = [
        /(?:the|a)\s+([a-zA-Z\s]+?)\s+(?:was|is)\s+(?:delicious|good|great|amazing|tasty)/gi,
        /(?:ordered|ate|had|tried)\s+(?:the\s+)?([a-zA-Z\s]+?)(?:\.|,|!|\s+and|\s+was)/gi,
        /「(.+?)」(?:\s*が|\s*を)/g,
        /([^、。!?\s]+?)(?:が|は)(?:美味|おい|うま)/g
    ];

    const stopWords = new Set([
        'it', 'that', 'this', 'everything', 'staff', 'service', 'place', 'atmosphere', 'price',
        'dinner', 'lunch', 'breakfast', 'meal', 'food', 'restaurant', 'option', 'menu', 'vegan',
        '店', '雰囲気', 'スタッフ', '接客', '値段', '価格'
    ]);

    for (const review of reviews) {
        const text = review.text || '';
        const rating = review.rating || 3;

        for (const pattern of patterns) {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const capture = match[1]?.trim().toLowerCase();
                if (capture && capture.length > 2 && capture.length < 30 && !stopWords.has(capture)) {
                    const current = menuCandidates.get(capture) || { count: 0, totalRating: 0 };
                    menuCandidates.set(capture, {
                        count: current.count + 1,
                        totalRating: current.totalRating + rating
                    });
                }
            }
        }
    }

    return Array.from(menuCandidates.entries())
        .map(([name, data]) => ({
            name: name.replace(/\b\w/g, l => l.toUpperCase()),
            count: data.count,
            sentiment: Math.round((data.totalRating / data.count) * 10) / 10
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
}

// Helper: Extract AI summary (pros only)
function extractAISummary(reviews: any[]): { pros: string[] } | null {
    if (!reviews || reviews.length === 0) return null;

    const pros: string[] = [];
    const positivePatterns = [
        /(?:delicious|amazing|great|best|excellent|tasty)\s+([a-zA-Z\s]+)/gi,
        /(?:loved|enjoyed|recommend)\s+(?:the\s+)?([a-zA-Z\s]+)/gi
    ];

    for (const review of reviews) {
        const text = review.text || '';
        for (const pattern of positivePatterns) {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                if (match[1] && match[1].length > 3) {
                    pros.push(match[1].trim());
                }
            }
        }
    }

    const uniquePros = Array.from(new Set(pros)).slice(0, 5);
    return uniquePros.length > 0 ? { pros: uniquePros } : null;
}

// Helper: Analyze vibe using Gemini
async function analyzeVibe(photoReferences: string[], apiKey: string, geminiKey: string): Promise<string[]> {
    if (!geminiKey || !photoReferences || photoReferences.length === 0) return [];

    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const imageParts = [];
        for (const ref of photoReferences.slice(0, 2)) {
            const b64 = await downloadImageAsBase64(ref, apiKey);
            if (b64) {
                imageParts.push({ inlineData: { data: b64, mimeType: "image/jpeg" } });
            }
        }

        if (imageParts.length === 0) return [];

        const prompt = `Analyze these restaurant photos and identify the atmosphere.
Return ONLY a JSON array with matching tags from this list: ["Romantic", "Work Friendly", "Solo Friendly", "Lively", "Quiet", "Family Friendly"]
Example response: ["Romantic", "Quiet"]`;

        const result = await model.generateContent([prompt, ...imageParts]);
        const text = await result.response.text();

        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error('Vibe analysis failed:', error);
        return [];
    }
}

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get all restaurants
    const { data: restaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, name, google_place_id')
        .order('name')
        .limit(limit);

    if (fetchError || !restaurants) {
        return NextResponse.json({ error: 'Failed to fetch restaurants', details: fetchError?.message }, { status: 500 });
    }

    const results = {
        total: restaurants.length,
        synced: 0,
        errors: [] as string[],
        details: [] as { name: string; photos: number; menu: number; vibes: number; success: boolean }[]
    };

    for (const restaurant of restaurants) {
        try {
            // Fetch from Google Places API
            const params = new URLSearchParams({
                place_id: restaurant.google_place_id,
                fields: 'name,formatted_address,geometry,opening_hours,photos,reviews,rating,user_ratings_total,price_level,formatted_phone_number,url',
                key: apiKey,
                language: 'ja'
            });

            const response = await fetch(`${GOOGLE_PLACES_API_URL}/details/json?${params}`);
            const data = await response.json();

            if (data.status !== 'OK') {
                results.errors.push(`${restaurant.name}: ${data.status}`);
                results.details.push({ name: restaurant.name, photos: 0, menu: 0, vibes: 0, success: false });
                continue;
            }

            const place = data.result;
            const photos = (place.photos || []).slice(0, 8).map((p: any) => p.photo_reference);
            const realMenu = extractRealMenu(place.reviews);
            const aiSummary = extractAISummary(place.reviews);

            // Analyze vibe (only if Gemini key exists)
            let vibeTags: string[] = [];
            if (geminiKey && photos.length > 0) {
                vibeTags = await analyzeVibe(photos, apiKey, geminiKey);
            }

            // Update database
            const updateData: Record<string, any> = {
                rating: place.rating,
                user_ratings_total: place.user_ratings_total,
                opening_hours: place.opening_hours?.weekday_text || null,
                photos: photos,
                phone_number: place.formatted_phone_number,
                google_maps_uri: place.url,
                price_level: place.price_level,
                last_synced_at: new Date().toISOString()
            };

            // Only add if data exists
            if (realMenu.length > 0) updateData.real_menu = realMenu;
            if (aiSummary) updateData.ai_summary = aiSummary;
            if (vibeTags.length > 0) updateData.vibe_tags = vibeTags;

            const { error: updateError } = await (supabase as any)
                .from('restaurants')
                .update(updateData)
                .eq('id', restaurant.id);

            if (updateError) {
                results.errors.push(`${restaurant.name}: Update failed - ${updateError.message}`);
                results.details.push({ name: restaurant.name, photos: 0, menu: 0, vibes: 0, success: false });
            } else {
                results.synced++;
                results.details.push({
                    name: restaurant.name,
                    photos: photos.length,
                    menu: realMenu.length,
                    vibes: vibeTags.length,
                    success: true
                });
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 500));

        } catch (error: any) {
            results.errors.push(`${restaurant.name}: ${error.message}`);
            results.details.push({ name: restaurant.name, photos: 0, menu: 0, vibes: 0, success: false });
        }
    }

    return NextResponse.json({
        success: true,
        message: `Full sync completed: ${results.synced}/${results.total} restaurants`,
        results
    });
}
