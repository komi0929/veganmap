import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const placeId = searchParams.get('placeId');

    if (!placeId) {
        return NextResponse.json(
            { error: 'placeId is required' },
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
        const params = new URLSearchParams({
            place_id: placeId,
            fields: 'place_id,name,formatted_address,geometry,formatted_phone_number,website,opening_hours,photos,rating,reviews,types,url',
            key: apiKey,
            language: 'ja'
        });

        const url = `${GOOGLE_PLACES_API_URL}/details/json?${params}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            console.error('Place details error:', data.status, data.error_message);
            return NextResponse.json(
                { error: data.error_message || 'Failed to get place details' },
                { status: 500 }
            );
        }

        const place = data.result;
        const details = {
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            phone: place.formatted_phone_number,
            website: place.website,
            google_maps_url: place.url,
            rating: place.rating,
            opening_hours: place.opening_hours?.weekday_text,
            is_open_now: place.opening_hours?.open_now,
            photos: place.photos?.slice(0, 5).map((p: any) => p.photo_reference),
            reviews: place.reviews?.slice(0, 5).map((r: any) => ({
                author: r.author_name,
                rating: r.rating,
                text: r.text,
                time: r.relative_time_description
            })),
            types: place.types
        };

        return NextResponse.json({ details });
    } catch (error) {
        console.error('Place details error:', error);
        return NextResponse.json(
            { error: 'Failed to get place details' },
            { status: 500 }
        );
    }
}
