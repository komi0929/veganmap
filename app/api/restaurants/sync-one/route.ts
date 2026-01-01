import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';
const MAX_RETRIES = 3;

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
        const unique = [...new Set(items.map(i => i.trim()))];
        return unique.slice(0, 5).map((name, idx) => ({
            name,
            count: 1,
            sentiment: 4.5 - idx * 0.2
        }));
    }
    return [];
}

// Helper: Extract multilingual AI summary + inbound scores in ONE call (efficiency)
async function extractEnhancedDataWithAI(reviews: any[], geminiKey: string): Promise<{
    ai_summary: { pros: string[] } | null;
    multilingual_summary: { ja: string[]; en: string[]; ko: string[]; zh: string[] } | null;
    inbound_scores: { englishFriendly: number; cardsAccepted: number; veganConfidence: number; touristPopular: number } | null;
}> {
    if (!reviews || reviews.length === 0 || !geminiKey) {
        return { ai_summary: null, multilingual_summary: null, inbound_scores: null };
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const reviewTexts = reviews
        .map(r => `[${r.rating}★] [${r.language || 'unknown'}] ${r.text}`)
        .filter(Boolean)
        .join('\n---\n');

    const prompt = `Analyze these restaurant reviews and extract data for VEGAN TOURISTS.

Reviews:
${reviewTexts}

Return a JSON object with:
1. "multilingual_summary": Highlights in 4 languages (3-5 items each, max 15 chars per item)
2. "inbound_scores": Tourist-friendliness scores (0-100 each)

JSON format:
{
  "multilingual_summary": {
    "ja": ["日本語で良い点1", "日本語で良い点2", "日本語で良い点3"],
    "en": ["Good point in English 1", "Good point 2", "Good point 3"],
    "ko": ["한국어로 좋은점1", "좋은점2", "좋은점3"],
    "zh": ["中文优点1", "优点2", "优点3"]
  },
  "inbound_scores": {
    "englishFriendly": 0-100,
    "cardsAccepted": 0-100,
    "veganConfidence": 0-100,
    "touristPopular": 0-100
  }
}

- Make highlights SPECIFIC (e.g., "Crispy vegan katsu" not "Good food")
- englishFriendly: Can tourists communicate in English?
- cardsAccepted: Are credit cards likely accepted?
- veganConfidence: How safe is it for strict vegans?
- touristPopular: Is it popular with foreign visitors?`;

    try {
        const result = await model.generateContent(prompt);
        const text = await result.response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                ai_summary: parsed.multilingual_summary?.ja?.length > 0
                    ? { pros: parsed.multilingual_summary.ja }
                    : null,
                multilingual_summary: parsed.multilingual_summary || null,
                inbound_scores: parsed.inbound_scores || null
            };
        }
    } catch (error) {
        console.error('extractEnhancedDataWithAI failed:', error);
    }

    return { ai_summary: null, multilingual_summary: null, inbound_scores: null };
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

// Sync a single restaurant with retry
async function syncSingleRestaurant(
    restaurantId: string,
    googlePlaceId: string,
    apiKey: string,
    geminiKey: string,
    supabase: any,
    retryCount: number = 0
): Promise<{ success: boolean; error?: string; data?: any }> {

    // Update status to processing
    await supabase
        .from('restaurants')
        .update({ sync_status: 'processing', sync_retry_count: retryCount })
        .eq('id', restaurantId);

    try {
        // Fetch from Google Places API
        const params = new URLSearchParams({
            place_id: googlePlaceId,
            fields: 'name,formatted_address,geometry,opening_hours,photos,reviews,rating,user_ratings_total,price_level,formatted_phone_number,url',
            key: apiKey,
            language: 'ja'
        });

        const response = await fetch(`${GOOGLE_PLACES_API_URL}/details/json?${params}`);
        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(`Google Places API: ${data.status}`);
        }

        const place = data.result;
        const rawPhotos = (place.photos || []).slice(0, 8).map((p: any) => p.photo_reference);

        // Heuristic: Google Places typically returns exterior as 1st photo
        // Reorder to prioritize 2nd-4th photos (more likely food/interior)
        let photos = rawPhotos;
        if (rawPhotos.length >= 3) {
            // Put photos 2,3,4 first, then 1, then rest
            photos = [
                ...rawPhotos.slice(1, 4),  // Photos 2,3,4 (indices 1-3)
                rawPhotos[0],               // Photo 1 (exterior)
                ...rawPhotos.slice(4)       // Rest
            ];
        }

        // Extract data using Gemini AI
        let realMenu: { name: string; count: number; sentiment: number }[] = [];
        let enhancedData: {
            ai_summary: { pros: string[] } | null;
            multilingual_summary: any;
            inbound_scores: any;
        } = { ai_summary: null, multilingual_summary: null, inbound_scores: null };
        let vibeTags: string[] = [];

        if (geminiKey && place.reviews && place.reviews.length > 0) {
            // Extract menu items
            realMenu = await extractRealMenuWithAI(place.reviews, geminiKey);
            await new Promise(r => setTimeout(r, 1000));

            // Extract multilingual summary + inbound scores in ONE call
            enhancedData = await extractEnhancedDataWithAI(place.reviews, geminiKey);
            await new Promise(r => setTimeout(r, 1000));

            // Analyze vibe from photos
            if (photos.length > 0) {
                vibeTags = await analyzeVibe(photos, apiKey, geminiKey);
            }
        }

        // Determine sync status
        const syncStatus = 'completed';

        // Update database with all enhanced fields
        const updateData: Record<string, any> = {
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            opening_hours: place.opening_hours?.weekday_text || null,
            photos: photos,
            phone_number: place.formatted_phone_number,
            google_maps_uri: place.url,
            price_level: place.price_level,
            address: place.formatted_address,
            last_synced_at: new Date().toISOString(),
            sync_status: syncStatus,
            sync_error: null,
            sync_retry_count: retryCount,
            cached_reviews: place.reviews || []
        };

        if (realMenu.length > 0) updateData.real_menu = realMenu;
        if (enhancedData.ai_summary) updateData.ai_summary = enhancedData.ai_summary;
        if (enhancedData.multilingual_summary) updateData.multilingual_summary = enhancedData.multilingual_summary;
        if (enhancedData.inbound_scores) updateData.inbound_scores = enhancedData.inbound_scores;
        if (vibeTags.length > 0) updateData.vibe_tags = vibeTags;

        const { error: updateError } = await supabase
            .from('restaurants')
            .update(updateData)
            .eq('id', restaurantId);

        if (updateError) {
            throw new Error(`DB Update: ${updateError.message}`);
        }

        return {
            success: true,
            data: {
                photos: photos.length,
                menu: realMenu.length,
                summary: enhancedData.ai_summary?.pros?.length || 0,
                vibes: vibeTags.length,
                hasMultilingual: !!enhancedData.multilingual_summary,
                hasInbound: !!enhancedData.inbound_scores
            }
        };

    } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';

        // Check if we should retry
        if (retryCount < MAX_RETRIES - 1) {
            // Exponential backoff: 2s, 4s, 8s
            const delay = Math.pow(2, retryCount + 1) * 1000;
            await new Promise(r => setTimeout(r, delay));

            return syncSingleRestaurant(
                restaurantId,
                googlePlaceId,
                apiKey,
                geminiKey,
                supabase,
                retryCount + 1
            );
        }

        // Max retries reached, mark as failed
        await supabase
            .from('restaurants')
            .update({
                sync_status: 'failed',
                sync_error: errorMessage,
                sync_retry_count: retryCount
            })
            .eq('id', restaurantId);

        return { success: false, error: errorMessage };
    }
}

// API endpoint: Sync a single restaurant by ID
export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const restaurantId = searchParams.get('restaurantId');

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!restaurantId) {
        return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
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

    // Get restaurant
    const { data: restaurant, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, name, google_place_id')
        .eq('id', restaurantId)
        .single();

    if (fetchError || !restaurant) {
        return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Sync with retry
    const result = await syncSingleRestaurant(
        restaurant.id,
        restaurant.google_place_id,
        apiKey,
        geminiKey!,
        supabase
    );

    return NextResponse.json({
        success: result.success,
        restaurant: restaurant.name,
        ...(result.success ? { data: result.data } : { error: result.error })
    });
}
