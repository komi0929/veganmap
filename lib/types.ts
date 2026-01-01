import { Database } from './database.types';

export type RestaurantRow = Database['public']['Tables']['restaurants']['Row'];
export type RestaurantInsert = Database['public']['Tables']['restaurants']['Insert'];
export type ReservationRow = Database['public']['Tables']['reservations']['Row'];
export type ReservationInsert = Database['public']['Tables']['reservations']['Insert'];

export type Restaurant = Omit<RestaurantRow, 'real_menu' | 'ai_summary' | 'dietary_tags'> & {
    // Specific overrides for Json fields
    dietary_tags: Record<string, boolean> | null;
    real_menu: { name: string; count: number; sentiment: number }[] | null;
    ai_summary: { pros: string[]; cons?: string[]; tips?: string[] } | null;

    // Phase 1 Innovation fields
    vibe_tags?: string[];
    multilingual_summary?: { ja?: string[]; en?: string[]; ko?: string[]; zh?: string[] };
    inbound_scores?: { englishFriendly: number; cardsAccepted: number; veganConfidence: number; touristPopular: number };
};

export type ReservationStatus = 'pending' | 'confirmed' | 'rejected';

export type Reservation = Omit<ReservationRow, 'dietary_requirements'> & {
    dietary_request?: { // Keeping old name for compatibility/aliasing or mapping to dietary_requirements
        vegan?: boolean;
        vegetarian?: boolean;
        gluten_free?: boolean;
        allergies?: string;
        other?: string;
    };
    dietary_requirements?: { // New name in DB
        vegan?: boolean;
        vegetarian?: boolean;
        gluten_free?: boolean;
        allergies?: string;
        other?: string;
    };
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
    rating: number | null; // changed to match DB
    comment: string | null;
    created_at: string;
    // Joined
    restaurants?: Restaurant;
}
