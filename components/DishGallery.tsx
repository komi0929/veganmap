'use client';

import { useMemo } from 'react';
import { Restaurant } from '@/lib/types';
import { useTranslations } from 'next-intl';
import { MapPin, Star } from 'lucide-react';
import Image from 'next/image';

interface DishGalleryProps {
    restaurants: Restaurant[];
    onSelect: (restaurant: Restaurant) => void;
}

export default function DishGallery({ restaurants, onSelect }: DishGalleryProps) {
    const t = useTranslations('Index');

    // Flatten all photos from all restaurants into a single array
    const dishCards = useMemo(() => {
        const photos: { photo: string; restaurant: Restaurant }[] = [];

        restaurants.forEach(r => {
            // Take up to 3 photos per restaurant to avoid one place dominating
            // (In a real app, we'd pick the "best" ones or food-specific ones)
            if (r.photos && Array.isArray(r.photos)) {
                r.photos.slice(0, 3).forEach(photo => {
                    photos.push({
                        photo,
                        restaurant: r
                    });
                });
            }
        });

        // Shuffle slightly to give variety? Or keep sorted by rating?
        // Let's sort by rating for now to show best food first
        return photos.sort((a, b) => (b.restaurant.rating || 0) - (a.restaurant.rating || 0));
    }, [restaurants]);

    if (dishCards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                <p>No food photos found</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 pb-24 md:pb-4 overflow-y-auto h-full bg-stone-50">
            {dishCards.map((item, index) => (
                <div
                    key={`${item.restaurant.id}-${index}`}
                    onClick={() => onSelect(item.restaurant)}
                    className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-stone-200 shadow-sm hover:shadow-xl transition-all hover:scale-[1.02]"
                >
                    <img
                        src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${item.photo}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                        alt={item.restaurant.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                        <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight mb-1">
                            {item.restaurant.name}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-stone-300">
                            <span className="flex items-center gap-1">
                                <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                {item.restaurant.rating}
                            </span>
                            <span className="flex items-center gap-1">
                                <MapPin size={10} />
                                {t('viewMap')}
                            </span>
                        </div>
                    </div>

                    {/* Floating Tag (Visible always) */}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] text-white font-medium opacity-100 group-hover:opacity-0 transition-opacity">
                        {item.restaurant.price_level ? '¥'.repeat(item.restaurant.price_level) : ''}
                    </div>
                </div>
            ))}
        </div>
    );
}
