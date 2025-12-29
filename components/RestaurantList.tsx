'use client';

import { MapPin, Star } from 'lucide-react';
import { Restaurant } from '@/lib/types';
import { useTranslations } from 'next-intl';
import FavoriteButton from './FavoriteButton';

interface RestaurantListProps {
    restaurants: Restaurant[];
    onSelect?: (restaurant: Restaurant) => void;
    selectedId?: string;
}

export default function RestaurantList({ restaurants, onSelect, selectedId }: RestaurantListProps) {
    const t = useTranslations('Index');

    if (restaurants.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-stone-500">
                <p>{t('noResults')}</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto p-4 space-y-4 bg-white/50 backdrop-blur-sm">
            {restaurants.map((restaurant) => (
                <div
                    key={restaurant.id}
                    onClick={() => onSelect?.(restaurant)}
                    className={`p-4 bg-white rounded-xl shadow-sm border transition-all cursor-pointer
                        ${selectedId === restaurant.id
                            ? 'border-green-500 ring-2 ring-green-200'
                            : 'border-stone-100 hover:shadow-md hover:border-stone-200'
                        }`}
                >
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-lg text-stone-800 flex-1">{restaurant.name}</h3>
                        <div className="flex items-center gap-2">
                            {(restaurant as any).rating && (
                                <span className="flex items-center gap-1 text-sm text-stone-600">
                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                    {(restaurant as any).rating}
                                </span>
                            )}
                            {restaurant.is_verified ? (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Verified</span>
                            ) : (
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">Pending</span>
                            )}
                            <FavoriteButton restaurantId={restaurant.id} size={18} />
                        </div>
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                        {restaurant.tags?.map(tag => (
                            <span key={tag} className="px-2 py-1 text-xs border border-stone-200 rounded-lg text-stone-600">
                                #{tag}
                            </span>
                        ))}
                    </div>
                    <div className="mt-3 text-sm text-stone-500 flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{restaurant.address || 'Unknown Location'}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}


