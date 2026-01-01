import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

// Download image as Base64
async function downloadImageAsBase64(photoReference: string, apiKey: string): Promise<string | null> {
    try {
        const url = `${GOOGLE_PLACES_API_URL}/photo?maxwidth=800&photo_reference=${photoReference}&key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch {
        return null;
    }
}

interface PhotoClassification {
    photoReference: string;
    type: 'food' | 'interior' | 'exterior' | 'menu' | 'other';
    dishName?: string;
    confidence: number;
}

// Classify photos using Gemini Vision
async function classifyPhotos(
    photoReferences: string[],
    apiKey: string,
    geminiKey: string
): Promise<PhotoClassification[]> {
    if (!geminiKey || photoReferences.length === 0) return [];

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const results: PhotoClassification[] = [];

    // Process photos in batches of 3 to avoid rate limits
    for (let i = 0; i < photoReferences.length; i += 3) {
        const batch = photoReferences.slice(i, i + 3);

        const imageParts = [];
        const validRefs: string[] = [];

        for (const ref of batch) {
            const b64 = await downloadImageAsBase64(ref, apiKey);
            if (b64) {
                imageParts.push({ inlineData: { data: b64, mimeType: "image/jpeg" } });
                validRefs.push(ref);
            }
        }

        if (imageParts.length === 0) continue;

        try {
            const prompt = `Analyze these ${imageParts.length} restaurant photos. For EACH photo, classify it and identify any food.

Return a JSON array with one object per photo in order:
[
  {
    "type": "food" | "interior" | "exterior" | "menu" | "other",
    "dishName": "name of dish if food, null otherwise",
    "confidence": 0.0-1.0
  }
]

Focus on identifying FOOD photos - these are the most valuable.
If it's food, try to identify the dish name in English (e.g., "Vegan Ramen", "Matcha Waffle").`;

            const result = await model.generateContent([prompt, ...imageParts]);
            const text = await result.response.text();

            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const classifications = JSON.parse(jsonMatch[0]);
                for (let j = 0; j < validRefs.length && j < classifications.length; j++) {
                    results.push({
                        photoReference: validRefs[j],
                        type: classifications[j].type || 'other',
                        dishName: classifications[j].dishName || undefined,
                        confidence: classifications[j].confidence || 0.5
                    });
                }
            }
        } catch (error) {
            console.error('Photo classification failed:', error);
            // Add unclassified entries
            for (const ref of validRefs) {
                results.push({ photoReference: ref, type: 'other', confidence: 0 });
            }
        }

        // Rate limit delay
        await new Promise(r => setTimeout(r, 1500));
    }

    return results;
}

// Generate multilingual AI summary
async function generateMultilingualSummary(
    reviews: any[],
    geminiKey: string
): Promise<{ ja: string[]; en: string[]; ko: string[]; zh: string[] } | null> {
    if (!reviews || reviews.length === 0 || !geminiKey) return null;

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const reviewTexts = reviews
        .map(r => `[${r.rating}★] ${r.text}`)
        .filter(Boolean)
        .join('\n---\n');

    const prompt = `Analyze these restaurant reviews and create highlights in 4 languages.
Focus on what makes this place special for VEGAN tourists.

Reviews:
${reviewTexts}

Return JSON with highlights in each language (3-5 items each, max 20 chars per item):
{
  "ja": ["日本語ハイライト1", "日本語ハイライト2"],
  "en": ["English highlight 1", "English highlight 2"],
  "ko": ["한국어 하이라이트 1", "한국어 하이라이트 2"],
  "zh": ["中文亮点1", "中文亮点2"]
}

Make highlights specific and appealing (e.g., "Crispy vegan katsu", "Cozy solo seating").`;

    try {
        const result = await model.generateContent(prompt);
        const text = await result.response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error('Multilingual summary failed:', error);
    }

    return null;
}

// Analyze inbound-friendly scores from reviews
async function analyzeInboundScores(
    reviews: any[],
    geminiKey: string
): Promise<{
    englishFriendly: number;
    cardsAccepted: number;
    veganConfidence: number;
    touristPopular: number;
} | null> {
    if (!reviews || reviews.length === 0 || !geminiKey) return null;

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const reviewTexts = reviews
        .map(r => `[${r.language || 'unknown'}] ${r.text}`)
        .filter(Boolean)
        .join('\n---\n');

    const prompt = `Analyze these reviews for inbound tourist friendliness.

Reviews:
${reviewTexts}

Score each factor 0-100:
- englishFriendly: Can tourists communicate in English? (menu, staff, signs)
- cardsAccepted: Are credit cards likely accepted? (mentions of card, cash only)
- veganConfidence: How confident are vegans about the food safety?
- touristPopular: Is this popular among foreign visitors?

Return JSON only:
{
  "englishFriendly": 0-100,
  "cardsAccepted": 0-100,
  "veganConfidence": 0-100,
  "touristPopular": 0-100
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = await result.response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error('Inbound score analysis failed:', error);
    }

    return null;
}

// Main API endpoint
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

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
    const geminiKey = process.env.GEMINI_API_KEY!;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get restaurant with photos
    const { data: restaurant, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, name, google_place_id, photos, cached_reviews')
        .eq('id', restaurantId)
        .single();

    if (fetchError || !restaurant) {
        return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Classify photos
    const photoClassifications = await classifyPhotos(
        restaurant.photos || [],
        apiKey,
        geminiKey
    );

    // Sort: food photos first, then interior, then others
    const sortedPhotos = [...photoClassifications].sort((a, b) => {
        const order = { food: 0, menu: 1, interior: 2, exterior: 3, other: 4 };
        return (order[a.type] || 4) - (order[b.type] || 4);
    });

    // Extract food photos with dish names
    const foodPhotos = sortedPhotos
        .filter(p => p.type === 'food')
        .map(p => ({
            photoReference: p.photoReference,
            dishName: p.dishName
        }));

    // Generate multilingual summary
    const multilingualSummary = await generateMultilingualSummary(
        restaurant.cached_reviews || [],
        geminiKey
    );

    // Analyze inbound scores
    const inboundScores = await analyzeInboundScores(
        restaurant.cached_reviews || [],
        geminiKey
    );

    // Update database
    const updateData: Record<string, any> = {
        photo_classifications: photoClassifications,
        food_photos: foodPhotos,
        photos_sorted: sortedPhotos.map(p => p.photoReference),
        multilingual_summary: multilingualSummary,
        inbound_scores: inboundScores
    };

    const { error: updateError } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', restaurantId);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        restaurant: restaurant.name,
        results: {
            totalPhotos: photoClassifications.length,
            foodPhotos: foodPhotos.length,
            hasMultilingualSummary: !!multilingualSummary,
            hasInboundScores: !!inboundScores
        }
    });
}
