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

// Classify photos using Gemini Vision - analyze all photos together
async function classifyPhotos(photoReferences: string[], apiKey: string, geminiKey: string): Promise<{
    foodPhotos: string[];
    otherPhotos: string[];
    debug: string;
}> {
    if (!geminiKey || photoReferences.length === 0) {
        return { foodPhotos: [], otherPhotos: photoReferences, debug: 'No Gemini key or photos' };
    }

    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Download up to 6 photos
        const targetRefs = photoReferences.slice(0, 6);
        const imageParts: { inlineData: { data: string; mimeType: string } }[] = [];
        const validRefs: string[] = [];

        for (const ref of targetRefs) {
            const b64 = await downloadImageAsBase64(ref, apiKey);
            if (b64) {
                imageParts.push({ inlineData: { data: b64, mimeType: "image/jpeg" } });
                validRefs.push(ref);
            }
        }

        if (imageParts.length === 0) {
            return { foodPhotos: [], otherPhotos: photoReferences, debug: 'Failed to download any images' };
        }

        // Analyze all photos together
        const prompt = `You are analyzing ${imageParts.length} restaurant photos for a vegan restaurant directory.

For each photo (numbered 1 to ${imageParts.length}), determine if it primarily shows FOOD (dishes, meals, plates with food, drinks, desserts) or NOT FOOD (exterior, interior, staff, menu boards, signage, tables without food).

Respond with a JSON object in this exact format:
{"foodIndices": [1, 3, 5]}

where foodIndices is an array of 1-based indices of photos that show food. If no photos show food, return {"foodIndices": []}`;

        const result = await model.generateContent([prompt, ...imageParts]);
        const text = await result.response.text();

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*"foodIndices"[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const foodIndices: number[] = parsed.foodIndices || [];

            const foodPhotos: string[] = [];
            const otherPhotos: string[] = [];

            validRefs.forEach((ref, idx) => {
                if (foodIndices.includes(idx + 1)) {
                    foodPhotos.push(ref);
                } else {
                    otherPhotos.push(ref);
                }
            });

            // Add any refs that weren't analyzed to otherPhotos
            photoReferences.slice(6).forEach(ref => otherPhotos.push(ref));

            return {
                foodPhotos,
                otherPhotos,
                debug: `Gemini response: ${text.substring(0, 200)}`
            };
        }

        return { foodPhotos: [], otherPhotos: photoReferences, debug: `No JSON in response: ${text.substring(0, 200)}` };

    } catch (error: any) {
        console.error('Photo classification error:', error);
        return { foodPhotos: [], otherPhotos: photoReferences, debug: `Error: ${error.message}` };
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

    for (const restaurant of toProcess.slice(0, 10)) { // Process 10 at a time (reduced for reliability)
        try {
            const { foodPhotos, otherPhotos, debug } = await classifyPhotos(
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
                totalCount: restaurant.photos.length,
                debug: debug
            } as any);

            // Rate limiting - longer delay for reliability
            await new Promise(r => setTimeout(r, 1000));

        } catch (error: any) {
            results.details.push({
                name: restaurant.name,
                foodCount: 0,
                totalCount: restaurant.photos?.length || 0,
                debug: `Exception: ${error.message}`
            } as any);
        }
    }

    return NextResponse.json({
        success: true,
        message: `Classified ${results.processed} restaurants, ${results.foodPhotosFound} had food photos`,
        results
    });
}
