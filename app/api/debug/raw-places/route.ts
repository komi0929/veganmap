import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

// Debug endpoint: Fetch raw Google Places data for one restaurant to analyze
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const placeId = searchParams.get('placeId') || 'ChIJ77kE603pQTUR8xMKnecG-Is'; // Default: and S organic

    if (secret !== process.env.SEED_SECRET && secret !== 'dev-seed-2024') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    // Fetch with Japanese language
    const paramsJa = new URLSearchParams({
        place_id: placeId,
        fields: 'name,reviews,rating,price_level',
        key: apiKey,
        language: 'ja'
    });

    const responseJa = await fetch(`${GOOGLE_PLACES_API_URL}/details/json?${paramsJa}`);
    const dataJa = await responseJa.json();

    // Fetch with English language
    const paramsEn = new URLSearchParams({
        place_id: placeId,
        fields: 'name,reviews,rating,price_level',
        key: apiKey,
        language: 'en'
    });

    const responseEn = await fetch(`${GOOGLE_PLACES_API_URL}/details/json?${paramsEn}`);
    const dataEn = await responseEn.json();

    // Analysis
    const jaReviews = dataJa.result?.reviews || [];
    const enReviews = dataEn.result?.reviews || [];

    const analysis = {
        placeName: dataJa.result?.name,
        rating: dataJa.result?.rating,
        priceLevel: dataJa.result?.price_level,

        japaneseReviews: {
            count: jaReviews.length,
            samples: jaReviews.slice(0, 3).map((r: any) => ({
                text: r.text?.substring(0, 200) + '...',
                rating: r.rating,
                language: r.language
            }))
        },

        englishReviews: {
            count: enReviews.length,
            samples: enReviews.slice(0, 3).map((r: any) => ({
                text: r.text?.substring(0, 200) + '...',
                rating: r.rating,
                language: r.language
            }))
        },

        // Test extraction patterns
        patternTests: {
            englishPatternMatches: 0,
            japanesePatternMatches: 0,
            sampleMatches: [] as string[]
        }
    };

    // Test English patterns
    const englishPatterns = [
        /(?:delicious|amazing|great|best|excellent|tasty)\s+([a-zA-Z\s]+)/gi,
        /(?:ordered|ate|had|tried)\s+(?:the\s+)?([a-zA-Z\s]+?)(?:\.|,|!|\s+and|\s+was)/gi
    ];

    for (const review of enReviews) {
        const text = review.text || '';
        for (const pattern of englishPatterns) {
            const matches = [...text.matchAll(pattern)];
            analysis.patternTests.englishPatternMatches += matches.length;
            matches.slice(0, 2).forEach(m => {
                if (m[1]) analysis.patternTests.sampleMatches.push(`EN: "${m[1].trim()}"`);
            });
        }
    }

    // Test Japanese patterns
    const japanesePatterns = [
        /「(.+?)」(?:\s*が|\s*を)/g,
        /([^、。!?\s]+?)(?:が|は)(?:美味|おい|うま)/g
    ];

    for (const review of jaReviews) {
        const text = review.text || '';
        for (const pattern of japanesePatterns) {
            const matches = [...text.matchAll(pattern)];
            analysis.patternTests.japanesePatternMatches += matches.length;
            matches.slice(0, 2).forEach(m => {
                if (m[1]) analysis.patternTests.sampleMatches.push(`JA: "${m[1].trim()}"`);
            });
        }
    }

    return NextResponse.json({
        status: dataJa.status,
        analysis
    });
}
