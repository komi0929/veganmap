export type Restaurant = {
    id: string;
    name: string;
    google_place_id: string;
    address: string | null;
    photos: string[] | null;
    is_verified: boolean;
    tags: string[] | null;
    latitude: number | null;
    longitude: number | null;

    // Extra fields from DB
    created_at?: string;
    price_level?: number | null;
    phone_number?: string | null;
    google_maps_uri?: string | null;
    website?: string | null;
    opening_hours?: any | null;
    rating?: number;
    user_ratings_total?: number;
    dietary_tags?: Record<string, boolean>;
    real_menu?: { name: string; count: number; sentiment: number }[];
    ai_summary?: { pros: string[] };
    vibe_tags?: string[];
};

export type ReservationStatus = 'pending' | 'confirmed' | 'rejected';

export type Reservation = {
    id?: string;
    restaurant_id: string;
    user_email: string;
    user_name: string;
    user_lang: string;
    dietary_request: {
        vegan?: boolean;
        vegetarian?: boolean;
        gluten_free?: boolean;
        allergies?: string;
        other?: string;
    };
    status?: ReservationStatus;
    owner_note?: string;
    created_at?: string;
};


export interface Bookmark {
    id: string;
    user_id: string;
    restaurant_id: string;
    created_at: string;
    // Joined
    restaurants?: Restaurant;
}

export interface Visit {
    id: string;
    user_id: string;
    restaurant_id: string;
    rating?: number;
    comment?: string;
    created_at: string;
    // Joined
    restaurants?: Restaurant;
}
