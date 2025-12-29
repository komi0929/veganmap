'use client';

import { Restaurant } from '@/lib/types';
import { Star, MapPin, Check, Clock } from 'lucide-react';
import FavoriteButton from './FavoriteButton';

interface MobileRestaurantCarouselProps {
    restaurants: Restaurant[];
    onSelect: (restaurant: Restaurant) => void;
    selectedId?: string;
}

export default function MobileRestaurantCarousel({ restaurants, onSelect, selectedId }: MobileRestaurantCarouselProps) {
    if (restaurants.length === 0) return null;

    return (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-4 hide-scrollbar">
            {restaurants.map((restaurant) => (
                <div
                    key={restaurant.id}
                    onClick={() => onSelect(restaurant)}
                    className={`flex-shrink-0 w-[85vw] max-w-[320px] bg-white rounded-2xl shadow-lg snap-center transition-all border
                        ${selectedId === restaurant.id
                            ? 'border-green-500 ring-2 ring-green-500/20'
                            : 'border-white'
                        }`}
                >
                    {/* Image / Gradient Header */}
                    <div className="h-32 bg-stone-200 rounded-t-2xl relative overflow-hidden">
                        {(restaurant as any).photos && (restaurant as any).photos[0] ? (
                            <img
                                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${(restaurant as any).photos[0]}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                                alt={restaurant.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                                <span className="text-3xl">🥗</span>
                            </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-2 right-2 flex gap-1">
                            {restaurant.is_verified && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-white/90 text-green-700 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1">
                                    <Check size={10} /> Verified
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-stone-900 truncate pr-2 text-base">{restaurant.name}</h3>
                            <div className="shrink-0 pt-0.5">
                                <FavoriteButton restaurantId={restaurant.id} size={18} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2 text-xs text-stone-600">
                            {(restaurant as any).rating && (
                                <span className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded text-yellow-700 font-medium">
                                    <Star size={10} className="fill-yellow-500 text-yellow-500" />
                                    {(restaurant as any).rating}
                                </span>
                            )}
                            {(restaurant as any).price_level !== undefined && (restaurant as any).price_level !== null && (
                                <span className="text-stone-500">
                                    {'¥'.repeat((restaurant as any).price_level || 1)}
                                </span>
                            )}
                            <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                                <MapPin size={10} />
                                <span className="truncate">{restaurant.address?.split(' ')[1] || restaurant.address || 'Unknown'}</span>
                            </span>
                        </div>

                        {/* Tags */}
                        {restaurant.tags && restaurant.tags.length > 0 && (
                            <div className="flex gap-1 overflow-hidden">
                                {restaurant.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="px-2 py-0.5 text-[10px] bg-stone-100 text-stone-600 rounded-full whitespace-nowrap">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
