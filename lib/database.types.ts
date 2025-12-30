export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            restaurants: {
                Row: {
                    id: string
                    google_place_id: string
                    name: string
                    address: string | null
                    photos: string[] | null // 0000 says text[], 0007 says jsonb but handled as array
                    is_verified: boolean
                    tags: string[] | null // 0000 says jsonb, simple tags
                    last_synced_at: string | null
                    cached_reviews: Json | null
                    created_at: string
                    latitude: number | null
                    longitude: number | null
                    price_level: number | null
                    phone_number: string | null
                    google_maps_uri: string | null
                    website: string | null
                    // From 0005
                    dietary_tags: Json | null
                    opening_hours: Json | null
                    rating: number | null
                    user_ratings_total: number | null
                    // From 0008
                    real_menu: Json | null
                    // From 0011
                    local_ratio: number | null
                    total_reviews_analyzed: number | null
                    ai_summary: Json | null
                    // From 0012
                    vibe_tags: string[] | null
                }
                Insert: {
                    id?: string
                    google_place_id: string
                    name: string
                    address?: string | null
                    photos?: string[] | null
                    is_verified?: boolean
                    tags?: string[] | null
                    last_synced_at?: string | null
                    cached_reviews?: Json | null
                    created_at?: string
                    latitude?: number | null
                    longitude?: number | null
                    price_level?: number | null
                    phone_number?: string | null
                    google_maps_uri?: string | null
                    website?: string | null
                    dietary_tags?: Json | null
                    opening_hours?: Json | null
                    rating?: number | null
                    user_ratings_total?: number | null
                    real_menu?: Json | null
                    local_ratio?: number | null
                    total_reviews_analyzed?: number | null
                    ai_summary?: Json | null
                    vibe_tags?: string[] | null
                }
                Update: {
                    id?: string
                    google_place_id?: string
                    name?: string
                    address?: string | null
                    photos?: string[] | null
                    is_verified?: boolean
                    tags?: string[] | null
                    last_synced_at?: string | null
                    cached_reviews?: Json | null
                    created_at?: string
                    latitude?: number | null
                    longitude?: number | null
                    price_level?: number | null
                    phone_number?: string | null
                    google_maps_uri?: string | null
                    website?: string | null
                    dietary_tags?: Json | null
                    opening_hours?: Json | null
                    rating?: number | null
                    user_ratings_total?: number | null
                    real_menu?: Json | null
                    local_ratio?: number | null
                    total_reviews_analyzed?: number | null
                    ai_summary?: Json | null
                    vibe_tags?: string[] | null
                }
            }
            reservations: {
                Row: {
                    id: string
                    restaurant_id: string
                    user_email: string
                    user_name: string
                    user_lang: string
                    dietary_requirements: Json | null // Changed from dietary_request in 0005
                    status: 'pending' | 'confirmed' | 'rejected'
                    owner_note: string | null
                    created_at: string
                    inquiry_type: string | null
                    last_inquiry_at: string | null
                }
                Insert: {
                    id?: string
                    restaurant_id: string
                    user_email: string
                    user_name: string
                    user_lang: string
                    dietary_requirements?: Json | null
                    status?: 'pending' | 'confirmed' | 'rejected'
                    owner_note?: string | null
                    created_at?: string
                    inquiry_type?: string | null
                    last_inquiry_at?: string | null
                }
                Update: {
                    id?: string
                    restaurant_id?: string
                    user_email?: string
                    user_name?: string
                    user_lang?: string
                    dietary_requirements?: Json | null
                    status?: 'pending' | 'confirmed' | 'rejected'
                    owner_note?: string | null
                    created_at?: string
                    inquiry_type?: string | null
                    last_inquiry_at?: string | null
                }
            }
            search_logs: {
                Row: {
                    id: string
                    search_term: string
                    restaurant_id: string | null
                    clicked_at: string | null
                    source: string | null
                }
                Insert: {
                    id?: string
                    search_term: string
                    restaurant_id?: string | null
                    clicked_at?: string | null
                    source?: string | null
                }
                Update: {
                    id?: string
                    search_term?: string
                    restaurant_id?: string | null
                    clicked_at?: string | null
                    source?: string | null
                }
            }
            bookmarks: {
                Row: {
                    id: string
                    user_id: string
                    restaurant_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    restaurant_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    restaurant_id?: string
                    created_at?: string
                }
            }
            visits: {
                Row: {
                    id: string
                    user_id: string
                    restaurant_id: string
                    rating: number | null
                    comment: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    restaurant_id: string
                    rating?: number | null
                    comment?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    restaurant_id?: string
                    rating?: number | null
                    comment?: string | null
                    created_at?: string
                }
            }
        }
    }
}
