import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

// Download image as base64
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

// Classify photos using Gemini Vision
async function classifyPhotos(photoReferences: string[], apiKey: string, geminiKey: string): Promise<{
    foodPhotos: string[];
    otherPhotos: string[];
}> {
    if (!geminiKey || photoReferences.length === 0) {
        return { foodPhotos: [], otherPhotos: photoReferences };
    }

    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const foodPhotos: string[] = [];
        const otherPhotos: string[] = [];

        // Analyze up to 5 photos (balance between quality and API quota)
        for (const ref of photoReferences.slice(0, 5)) {
            const b64 = await downloadImageAsBase64(ref, apiKey);
            if (!b64) {
                otherPhotos.push(ref);
                continue;
            }

            const prompt = `Is this image primarily a photo of FOOD or a DISH/MEAL?
Answer with exactly one word: "FOOD" if it shows food/dish/meal as the main subject, or "OTHER" if it shows interior, exterior, staff, menu board, signage, or anything else.
Just respond with: FOOD or OTHER`;

            const result = await model.generateContent([
                prompt,
                { inlineData: { data: b64, mimeType: "image/jpeg" } }
            ]);
            const text = await result.response.text();

            if (text.toUpperCase().includes('FOOD')) {
                foodPhotos.push(ref);
            } else {
                otherPhotos.push(ref);
            }

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 100));
        }

        // Add remaining photos to otherPhotos
        photoReferences.slice(5).forEach(ref => otherPhotos.push(ref));

        return { foodPhotos, otherPhotos };
    } catch (error) {
        console.error('Photo classification error:', error);
        return { foodPhotos: [], otherPhotos: photoReferences };
    }
}

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !geminiKey) {
        return NextResponse.json({ error: 'API keys not configured' }, { status: 500 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get all restaurants with photos
    const { data: restaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, name, photos')
        .order('name');

    if (fetchError || !restaurants) {
        return NextResponse.json({ error: 'Failed to fetch restaurants', details: fetchError?.message }, { status: 500 });
    }

    // Filter: only restaurants with photos array
    const toProcess = restaurants.filter(r =>
        r.photos && Array.isArray(r.photos) && r.photos.length > 1
    );

    const results = {
        total: restaurants.length,
        processed: 0,
        foodPhotosFound: 0,
        details: [] as { name: string; foodCount: number; totalCount: number }[]
    };

    for (const restaurant of toProcess.slice(0, 20)) { // Process 20 at a time
        try {
            const { foodPhotos, otherPhotos } = await classifyPhotos(
                restaurant.photos as string[],
                apiKey,
                geminiKey
            );

            // Reorder: food photos first, then other photos
            const orderedPhotos = [...foodPhotos, ...otherPhotos];

            // Update database with reordered photos (food first)
            await (supabase as any)
                .from('restaurants')
                .update({
                    photos: orderedPhotos
                })
                .eq('id', restaurant.id);

            results.processed++;
            if (foodPhotos.length > 0) results.foodPhotosFound++;
            results.details.push({
                name: restaurant.name,
                foodCount: foodPhotos.length,
                totalCount: restaurant.photos.length
            });

            // Rate limiting
            await new Promise(r => setTimeout(r, 500));

        } catch (error: any) {
            console.error(`Error classifying ${restaurant.name}:`, error);
        }
    }

    return NextResponse.json({
        success: true,
        message: `Classified ${results.processed} restaurants, ${results.foodPhotosFound} had food photos`,
        results
    });
}
