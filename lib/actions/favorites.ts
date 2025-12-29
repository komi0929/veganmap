'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function toggleFavorite(restaurantId: string, userId: string): Promise<{ isFavorite: boolean; error?: string }> {
    try {
        // Check if already favorited
        const { data: existing } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('restaurant_id', restaurantId)
            .single();

        if (existing) {
            // Remove favorite
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('id', existing.id);

            if (error) throw error;
            return { isFavorite: false };
        } else {
            // Add favorite
            const { error } = await supabase
                .from('favorites')
                .insert({ user_id: userId, restaurant_id: restaurantId });

            if (error) throw error;
            return { isFavorite: true };
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        return { isFavorite: false, error: 'Failed to update favorite' };
    }
}

export async function getUserFavorites(userId: string) {
    const { data, error } = await supabase
        .from('favorites')
        .select(`
            id,
            restaurant_id,
            created_at,
            restaurants (
                id,
                name,
                address,
                tags,
                is_verified,
                google_place_id,
                rating,
                dietary_tags
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Get favorites error:', error);
        return [];
    }

    return data?.map((item: any) => ({
        ...item,
        restaurants: Array.isArray(item.restaurants) ? item.restaurants[0] : item.restaurants
    })) || [];
}

export async function checkIsFavorite(restaurantId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .single();

    return !!data;
}

export async function triggerBulkInquiry(
    restaurantIds: string[],
    userId: string,
    userEmail: string,
    userName: string,
    dietaryTags: string[]
): Promise<{ success: boolean; sentCount: number; skippedCount: number }> {
    let sentCount = 0;
    let skippedCount = 0;

    for (const restaurantId of restaurantIds) {
        // Check for recent inquiry (spam prevention - 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentInquiry } = await supabase
            .from('reservations')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .eq('user_email', userEmail)
            .eq('inquiry_type', 'inquiry_only')
            .gte('created_at', sevenDaysAgo.toISOString())
            .single();

        if (recentInquiry) {
            skippedCount++;
            continue;
        }

        // Create inquiry record
        const { error } = await supabase
            .from('reservations')
            .insert({
                restaurant_id: restaurantId,
                user_email: userEmail,
                user_name: userName,
                user_lang: 'ja',
                inquiry_type: 'inquiry_only',
                status: 'pending',
                dietary_requirements: {
                    tags: dietaryTags
                }
            });

        if (!error) {
            sentCount++;

            // Get restaurant info for email
            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('name, owner_id')
                .eq('id', restaurantId)
                .single();

            // Send notification email (if owner exists)
            if (restaurant) {
                try {
                    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'inquiry_received',
                            data: {
                                restaurant_name: restaurant.name,
                                user_name: userName,
                                user_email: userEmail,
                                dietary_tags: dietaryTags
                            }
                        })
                    });
                } catch (emailError) {
                    console.error('Email notification error:', emailError);
                }
            }
        }
    }

    return { success: true, sentCount, skippedCount };
}
