import { supabase } from './supabaseClient';

export interface RestaurantWithSync {
    id: string;
    name: string;
    address: string | null;
    google_place_id: string;
    latitude: number | null;
    longitude: number | null;
    is_verified: boolean;
    tags: string[] | null;
    dietary_tags: DietaryTags;
    rating: number | null;
    user_ratings_total: number | null;
    opening_hours: string[] | null;
    photos: string[] | null;
    cached_reviews: ReviewSnippet[];
    last_synced_at: string | null;
    phone_number: string | null;
    price_level: number | null;
    google_maps_uri: string | null;
}

export interface DietaryTags {
    oriental_vegan?: boolean;
    alcohol_free?: boolean;
    nut_free?: boolean;
    soy_free?: boolean;
    halal?: boolean;
    kosher?: boolean;
}

export interface ReviewSnippet {
    text: string;
    rating: number;
    keywords: string[];
}

// Predictive menu items based on dietary tags
export const PREDICTIVE_MENU_ITEMS: Record<string, { emoji: string; items: string[] }> = {
    vegan: {
        emoji: '🌱',
        items: ['Vegetable Curry', 'Soy Meat Dishes', 'Tofu Steak', 'Vegan Ramen']
    },
    vegetarian: {
        emoji: '🥗',
        items: ['Cheese Pizza', 'Egg Dishes', 'Vegetable Tempura', 'Pasta']
    },
    oriental_vegan: {
        emoji: '🧘',
        items: ['Shojin Ryori', 'Buddhist-style Dishes', 'No Garlic/Onion Options']
    },
    alcohol_free: {
        emoji: '🥤',
        items: ['Non-alcoholic Drinks', 'Mocktails', 'Fresh Juices', 'Halal-friendly Dishes']
    },
    gluten_free: {
        emoji: '🌾',
        items: ['Rice Bowls', 'Grilled Fish', 'Rice Noodles', 'Sashimi']
    },
    nut_free: {
        emoji: '🥜',
        items: ['Nut-free Desserts', 'Safe Baked Goods']
    },
    halal: {
        emoji: '☪️',
        items: ['Halal Meat Dishes', 'Halal-certified Options']
    }
};

export async function syncRestaurantIfNeeded(restaurantId: string): Promise<RestaurantWithSync | null> {
    try {
        const response = await fetch('/api/restaurants/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId })
        });

        const data = await response.json();

        if (data.restaurant) {
            return data.restaurant as RestaurantWithSync;
        }

        return null;
    } catch (error) {
        console.error('Sync error:', error);
        return null;
    }
}

export function getPredictiveMenuItems(
    tags: string[] | null,
    dietaryTags: DietaryTags | null
): { emoji: string; label: string; items: string[] }[] {
    const results: { emoji: string; label: string; items: string[] }[] = [];

    // Check standard tags
    if (tags) {
        for (const tag of tags) {
            const normalizedTag = tag.toLowerCase().replace('-', '_');
            if (PREDICTIVE_MENU_ITEMS[normalizedTag]) {
                results.push({
                    emoji: PREDICTIVE_MENU_ITEMS[normalizedTag].emoji,
                    label: tag,
                    items: PREDICTIVE_MENU_ITEMS[normalizedTag].items
                });
            }
        }
    }

    // Check dietary tags
    if (dietaryTags) {
        for (const [key, value] of Object.entries(dietaryTags)) {
            if (value && PREDICTIVE_MENU_ITEMS[key] && !results.find(r => r.label === key)) {
                results.push({
                    emoji: PREDICTIVE_MENU_ITEMS[key].emoji,
                    label: key.replace('_', ' '),
                    items: PREDICTIVE_MENU_ITEMS[key].items
                });
            }
        }
    }

    return results;
}

export function formatLastSyncTime(lastSyncedAt: string | null): string {
    if (!lastSyncedAt) return 'Never synced';

    const date = new Date(lastSyncedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('ja-JP');
}
