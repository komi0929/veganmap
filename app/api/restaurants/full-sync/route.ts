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

// Helper: Extract menu items from reviews using Gemini AI
async function extractRealMenuWithAI(reviews: any[], geminiKey: string): Promise<{ name: string; count: number; sentiment: number }[]> {
    if (!reviews || reviews.length === 0 || !geminiKey) return [];

    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const reviewTexts = reviews
            .map(r => `[${r.rating}★] ${r.text}`)
            .filter(Boolean)
            .join('\n---\n');

        const prompt = `以下はレストランのレビューです。レビューから言及されている具体的な料理名・メニュー名を抽出してください。

レビュー:
${reviewTexts}

指示:
- 料理名のみを抽出（「カレー」「ハンバーガー」「ラテ」「vegan curry」など）
- 店名、雰囲気、接客、サービスなどは絶対に含めない
- 言語は問わない（日本語でも英語でもOK）
- JSON配列で返す: ["カレー", "ハンバーガー", "Vegan Latte"]
- 料理名が見つからない場合は空配列 []
- 最大5つまで`;

        const result = await model.generateContent(prompt);
        const text = await result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            const items: string[] = JSON.parse(jsonMatch[0]);
            // Remove duplicates and format
            const unique = [...new Set(items.map(i => i.trim()))];
            return unique.slice(0, 5).map((name, idx) => ({
                name,
                count: 1,
                sentiment: 4.5 - idx * 0.2 // Approximate sentiment based on order
            }));
        }
        return [];
    } catch (error) {
        console.error('extractRealMenuWithAI failed:', error);
        return [];
    }
}


// Helper: Extract AI summary (pros) using Gemini AI
async function extractAISummaryWithAI(reviews: any[], geminiKey: string): Promise<{ pros: string[] } | null> {
    if (!reviews || reviews.length === 0 || !geminiKey) return null;

    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const reviewTexts = reviews
            .map(r => `[${r.rating}★] ${r.text}`)
            .filter(Boolean)
            .join('\n---\n');

        const prompt = `以下はレストランのレビューです。このレストランの良い点（Pros）を3-5個抽出してください。

レビュー:
${reviewTexts}

指示:
- 簡潔に（各項目15文字以内）
- 具体的に（「美味しい」より「カレーが絶品」）
- 英語のレビューも日本語に翻訳して抽出
- JSON配列で返す: ["良い点1", "良い点2", "良い点3"]
- 良い点が見つからない場合は空配列 []`;

        const result = await model.generateContent(prompt);
        const text = await result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            const pros: string[] = JSON.parse(jsonMatch[0]);
            return pros.length > 0 ? { pros: pros.slice(0, 5) } : null;
        }
        return null;
    } catch (error) {
        console.error('extractAISummaryWithAI failed:', error);
        return null;
    }
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

            // Extract menu and summary using Gemini AI (requires key)
            let realMenu: { name: string; count: number; sentiment: number }[] = [];
            let aiSummary: { pros: string[] } | null = null;
            let vibeTags: string[] = [];

            if (geminiKey) {
                // Run AI extractions
                realMenu = await extractRealMenuWithAI(place.reviews, geminiKey);
                aiSummary = await extractAISummaryWithAI(place.reviews, geminiKey);

                // Analyze vibe from photos
                if (photos.length > 0) {
                    vibeTags = await analyzeVibe(photos, apiKey, geminiKey);
                }
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

            // Rate limiting - increased to 2 seconds to avoid Gemini API failures
            await new Promise(r => setTimeout(r, 2000));

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
