'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Check, Clock, ExternalLink, Calendar, Star, RefreshCw, Loader2, MessageSquare, Utensils } from 'lucide-react';
import { Restaurant } from '@/lib/types';
import { useTranslations } from 'next-intl';
import ReservationForm from './ReservationForm';
import { syncRestaurantIfNeeded, getPredictiveMenuItems, formatLastSyncTime, RestaurantWithSync, ReviewSnippet } from '@/lib/restaurantSync';

interface RestaurantDetailProps {
    restaurant: Restaurant | null;
    onClose: () => void;
}

export default function RestaurantDetail({ restaurant, onClose }: RestaurantDetailProps) {
    const t = useTranslations('Detail');
    const [showReservation, setShowReservation] = useState(false);
    const [syncedData, setSyncedData] = useState<RestaurantWithSync | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Trigger sync when restaurant is viewed
    useEffect(() => {
        if (restaurant?.id) {
            setIsSyncing(true);
            syncRestaurantIfNeeded(restaurant.id)
                .then(data => {
                    if (data) setSyncedData(data);
                })
                .finally(() => setIsSyncing(false));
        }
    }, [restaurant?.id]);

    if (!restaurant) return null;

    // Use synced data if available, otherwise use original
    const displayData = syncedData || restaurant;
    const dietaryTags = (displayData as any).dietary_tags;
    const cachedReviews: ReviewSnippet[] = (displayData as any).cached_reviews || [];
    const rating = (displayData as any).rating;
    const openingHours = (displayData as any).opening_hours;
    const lastSynced = (displayData as any).last_synced_at;

    // Get predictive menu items
    const predictiveItems = getPredictiveMenuItems(displayData.tags, dietaryTags);

    if (showReservation) {
        return (
            <ReservationForm
                restaurant={restaurant}
                onClose={() => {
                    setShowReservation(false);
                    onClose();
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative h-48 bg-gradient-to-br from-green-400 to-emerald-600">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                        <X className="text-white" size={20} />
                    </button>
                    <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                            {displayData.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {displayData.is_verified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                    <Check size={12} /> {t('verified')}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                    <Clock size={12} /> {t('pending')}
                                </span>
                            )}
                            {rating && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                    <Star size={12} className="fill-current" /> {rating}
                                </span>
                            )}
                            {isSyncing && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                    <RefreshCw size={12} className="animate-spin" /> {t('syncing')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-12rem)]">
                    {/* Address */}
                    <div className="flex items-start gap-3">
                        <MapPin className="text-stone-400 mt-1 shrink-0" size={18} />
                        <div>
                            <p className="text-sm text-stone-500">{t('address')}</p>
                            <p className="text-stone-800">{displayData.address || t('unknownLocation')}</p>
                        </div>
                    </div>

                    {/* Opening Hours */}
                    {openingHours && openingHours.length > 0 && (
                        <div className="flex items-start gap-3">
                            <Clock className="text-stone-400 mt-1 shrink-0" size={18} />
                            <div>
                                <p className="text-sm text-stone-500">{t('openingHours')}</p>
                                <div className="text-sm text-stone-700 space-y-0.5">
                                    {openingHours.slice(0, 3).map((hours: string, i: number) => (
                                        <p key={i}>{hours}</p>
                                    ))}
                                    {openingHours.length > 3 && (
                                        <p className="text-stone-400">...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {displayData.tags && displayData.tags.length > 0 && (
                        <div>
                            <p className="text-sm text-stone-500 mb-2">{t('tags')}</p>
                            <div className="flex flex-wrap gap-2">
                                {displayData.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded-full border border-green-200"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dietary Tags */}
                    {dietaryTags && Object.entries(dietaryTags).some(([_, v]) => v) && (
                        <div>
                            <p className="text-sm text-stone-500 mb-2">{t('dietaryOptions')}</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(dietaryTags).map(([key, value]) =>
                                    value ? (
                                        <span
                                            key={key}
                                            className="px-3 py-1 text-sm bg-purple-50 text-purple-700 rounded-full border border-purple-200"
                                        >
                                            ✓ {key.replace('_', ' ')}
                                        </span>
                                    ) : null
                                )}
                            </div>
                        </div>
                    )}

                    {/* Predictive Menu Items */}
                    {predictiveItems.length > 0 && (
                        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Utensils size={16} className="text-amber-600" />
                                <p className="text-sm font-medium text-amber-800">{t('likelyAvailable')}</p>
                            </div>
                            <div className="space-y-2">
                                {predictiveItems.map(item => (
                                    <div key={item.label} className="text-sm">
                                        <span className="mr-2">{item.emoji}</span>
                                        <span className="text-stone-600">{item.items.join(', ')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cached Reviews */}
                    {cachedReviews.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare size={16} className="text-stone-400" />
                                <p className="text-sm text-stone-500">{t('reviewHighlights')}</p>
                            </div>
                            <div className="space-y-2">
                                {cachedReviews.map((review, i) => (
                                    <div key={i} className="p-3 bg-stone-50 rounded-lg text-sm">
                                        <div className="flex items-center gap-1 mb-1">
                                            {Array.from({ length: review.rating }).map((_, j) => (
                                                <Star key={j} size={12} className="text-yellow-500 fill-yellow-500" />
                                            ))}
                                        </div>
                                        <p className="text-stone-700 italic">"{review.text}"</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {review.keywords.map(kw => (
                                                <span key={kw} className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Google Maps Link */}
                    <a
                        href={`https://www.google.com/maps/place/?q=place_id:${restaurant.google_place_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                    >
                        <ExternalLink size={16} />
                        {t('openInMaps')}
                    </a>

                    {/* Last Synced */}
                    {lastSynced && (
                        <p className="text-xs text-stone-400 text-right">
                            {t('lastUpdated')}: {formatLastSyncTime(lastSynced)}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-100 space-y-2">
                    <button
                        onClick={() => setShowReservation(true)}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <Calendar size={18} />
                        {t('makeReservation')}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors font-medium"
                    >
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
