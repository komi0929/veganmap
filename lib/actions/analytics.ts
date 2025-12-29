'use server';

import { supabase } from '@/lib/supabaseClient';

export async function logSearchClick(term: string, restaurantId: string, source: 'list' | 'map' | 'gallery') {
    if (!term || !term.trim()) return;

    // Fire and forget - don't block UI
    try {
        await supabase
            .from('search_logs')
            .insert({
                search_term: term.trim().toLowerCase(),
                restaurant_id: restaurantId,
                source: source
            });
    } catch (error) {
        console.error('Failed to log search:', error);
    }
}
