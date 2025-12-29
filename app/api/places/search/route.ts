import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const type = searchParams.get('type') || 'restaurant';

    if (!query && (!lat || !lng)) {
        return NextResponse.json(
            { error: 'Query or location (lat/lng) is required' },
            { status: 400 }
        );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'Google Maps API key not configured' },
            { status: 500 }
        );
    }

    try {
        let url: string;

        if (query) {
            // Text search for specific restaurant names
            const params = new URLSearchParams({
                query: `${query} vegan vegetarian`,
                type,
                key: apiKey,
                language: 'ja'
            });
            url = `${GOOGLE_PLACES_API_URL}/textsearch/json?${params}`;
        } else {
            // Nearby search for location-based results
            const params = new URLSearchParams({
                location: `${lat},${lng}`,
                radius: '5000',
                type,
                keyword: 'vegan vegetarian',
                key: apiKey,
                language: 'ja'
            });
            url = `${GOOGLE_PLACES_API_URL}/nearbysearch/json?${params}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error('Places API error:', data.status, data.error_message);
            return NextResponse.json(
                { error: data.error_message || 'Places API error' },
                { status: 500 }
            );
        }

        // Transform results to our format
        const places = (data.results || []).map((place: any) => ({
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address || place.vicinity,
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            photo_reference: place.photos?.[0]?.photo_reference,
            types: place.types,
            opening_hours: place.opening_hours
        }));

        return NextResponse.json({ places });
    } catch (error) {
        console.error('Places search error:', error);
        return NextResponse.json(
            { error: 'Failed to search places' },
            { status: 500 }
        );
    }
}
