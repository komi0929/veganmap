'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toggleFavorite } from '@/lib/actions/favorites';
import { useAuth } from '@/lib/AuthContext';

interface FavoriteButtonProps {
    restaurantId: string;
    initialFavorited?: boolean;
    size?: number;
    className?: string;
}

export default function FavoriteButton({
    restaurantId,
    initialFavorited = false,
    size = 20,
    className = ''
}: FavoriteButtonProps) {
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(initialFavorited);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click

        if (!user) {
            // Could show login modal here
            alert('Please login to save favorites');
            return;
        }

        // Optimistic update
        setIsFavorite(!isFavorite);
        setIsLoading(true);

        const result = await toggleFavorite(restaurantId, user.id);

        if (result.error) {
            // Revert on error
            setIsFavorite(isFavorite);
        } else {
            setIsFavorite(result.isFavorite);
        }

        setIsLoading(false);
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`p-2 rounded-full transition-all ${isFavorite
                    ? 'bg-red-50 text-red-500 hover:bg-red-100'
                    : 'bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600'
                } ${isLoading ? 'opacity-50' : ''} ${className}`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
            <Heart
                size={size}
                className={isFavorite ? 'fill-current' : ''}
            />
        </button>
    );
}
