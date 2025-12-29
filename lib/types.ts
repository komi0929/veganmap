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

