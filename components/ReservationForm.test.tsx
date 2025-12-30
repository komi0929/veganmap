import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReservationForm from './ReservationForm';
import { Restaurant } from '@/lib/types';
import { vi, describe, it, expect } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabaseClient', () => ({
    supabase: {
        from: () => ({
            insert: vi.fn(),
        })
    }
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    }
}));

describe('ReservationForm', () => {
    const mockRestaurant = {
        id: '123',
        name: 'Test Restaurant',
        google_place_id: 'abc',
        is_verified: true,
        created_at: '2023-01-01',
        photos: [],
        tags: [],
        latitude: 0,
        longitude: 0,
        address: '123 Test St',
        dietary_tags: null,
        real_menu: [],
        ai_summary: null,
        // Mock remaining fields to satisfy Restaurant type
        last_synced_at: null,
        cached_reviews: null,
        price_level: null,
        phone_number: null,
        google_maps_uri: null,
        website: null,
        opening_hours: null,
        rating: 4.5,
        user_ratings_total: 100,
        local_ratio: null,
        total_reviews_analyzed: null,
        vibe_tags: null
    } as any as Restaurant; // Cast to satisfy any remaining loose ends if types drift

    it('renders the form correctly', () => {
        render(<ReservationForm restaurant={mockRestaurant} onClose={() => { }} />);
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('namePlaceholder')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('emailPlaceholder')).toBeInTheDocument();
    });

    it('updates input fields correctly', () => {
        render(<ReservationForm restaurant={mockRestaurant} onClose={() => { }} />);
        const nameInput = screen.getByPlaceholderText('namePlaceholder') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        expect(nameInput.value).toBe('John Doe');
    });
});
