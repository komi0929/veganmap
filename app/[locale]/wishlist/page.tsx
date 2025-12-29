'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/AuthContext';
import { getUserFavorites, triggerBulkInquiry } from '@/lib/actions/favorites';
import FavoriteButton from '@/components/FavoriteButton';
import AuthForm from '@/components/AuthForm';
import Link from 'next/link';
import {
    ArrowLeft,
    Heart,
    Check,
    Clock,
    Loader2,
    Send,
    MapPin,
    Star,
    Sparkles
} from 'lucide-react';

interface FavoriteRestaurant {
    id: string;
    restaurant_id: string;
    created_at: string;
    restaurants: {
        id: string;
        name: string;
        address: string | null;
        tags: string[] | null;
        is_verified: boolean;
        google_place_id: string;
        rating: number | null;
        dietary_tags: Record<string, boolean> | null;
    };
}

export default function WishlistPage() {
    const t = useTranslations('Wishlist');
    const { user, isLoading: authLoading, signIn, signUp } = useAuth();
    const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [bulkResult, setBulkResult] = useState<{ sent: number; skipped: number } | null>(null);

    useEffect(() => {
        if (user) {
            loadFavorites();
        }
    }, [user]);

    const loadFavorites = async () => {
        if (!user) return;
        setIsLoading(true);
        const data = await getUserFavorites(user.id);
        setFavorites(data as FavoriteRestaurant[]);
        setIsLoading(false);
    };

    const handleBulkInquiry = async () => {
        if (!user) return;

        const pendingIds = favorites
            .filter(f => !f.restaurants.is_verified)
            .map(f => f.restaurant_id);

        if (pendingIds.length === 0) return;

        setIsSending(true);
        setBulkResult(null);

        // Get user's dietary preferences (simplified - could be from profile)
        const dietaryTags = ['vegan']; // Default, could be fetched from user profile

        const result = await triggerBulkInquiry(
            pendingIds,
            user.id,
            user.email || '',
            user.email?.split('@')[0] || 'Guest',
            dietaryTags
        );

        setBulkResult({ sent: result.sentCount, skipped: result.skippedCount });
        setIsSending(false);
    };

    // Auth loading
    if (authLoading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-green-600" />
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return <AuthForm onSignIn={signIn} onSignUp={signUp} />;
    }

    // Separate verified and pending
    const verifiedFavorites = favorites.filter(f => f.restaurants.is_verified);
    const pendingFavorites = favorites.filter(f => !f.restaurants.is_verified);

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-stone-600" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <Heart size={24} className="text-red-500 fill-red-500" />
                            <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
                        </div>
                        <span className="ml-auto text-sm text-stone-500">
                            {favorites.length} {t('items')}
                        </span>
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={32} className="animate-spin text-green-600" />
                    </div>
                ) : favorites.length === 0 ? (
                    <div className="text-center py-12">
                        <Heart size={48} className="mx-auto mb-4 text-stone-300" />
                        <p className="text-stone-500">{t('empty')}</p>
                        <Link
                            href="/"
                            className="inline-block mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                            {t('explore')}
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Pending Section with Bulk Action */}
                        {pendingFavorites.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Clock size={20} className="text-amber-500" />
                                        <h2 className="text-lg font-semibold text-stone-800">
                                            {t('pendingVerification')}
                                        </h2>
                                        <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                            {pendingFavorites.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Bulk Inquiry Button - The Killer Feature */}
                                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="text-purple-600 mt-1" size={20} />
                                        <div className="flex-1">
                                            <p className="font-medium text-purple-900 mb-1">
                                                {t('bulkInquiryTitle')}
                                            </p>
                                            <p className="text-sm text-purple-700 mb-3">
                                                {t('bulkInquiryDescription')}
                                            </p>
                                            <button
                                                onClick={handleBulkInquiry}
                                                disabled={isSending}
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                {isSending ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Send size={16} />
                                                )}
                                                {t('checkAllButton')} ({pendingFavorites.length})
                                            </button>
                                            {bulkResult && (
                                                <p className="mt-2 text-sm text-purple-700">
                                                    ✓ {t('sentCount', { count: bulkResult.sent })}
                                                    {bulkResult.skipped > 0 && (
                                                        <span className="text-stone-500">
                                                            {' '}({t('skippedCount', { count: bulkResult.skipped })})
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Pending List */}
                                <div className="space-y-3">
                                    {pendingFavorites.map(fav => (
                                        <RestaurantCard
                                            key={fav.id}
                                            restaurant={fav.restaurants}
                                            favoriteId={fav.id}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Verified Section */}
                        {verifiedFavorites.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Check size={20} className="text-green-600" />
                                    <h2 className="text-lg font-semibold text-stone-800">
                                        {t('verifiedSafe')}
                                    </h2>
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                        {verifiedFavorites.length}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {verifiedFavorites.map(fav => (
                                        <RestaurantCard
                                            key={fav.id}
                                            restaurant={fav.restaurants}
                                            favoriteId={fav.id}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function RestaurantCard({ restaurant, favoriteId }: {
    restaurant: FavoriteRestaurant['restaurants'];
    favoriteId: string;
}) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 flex items-start gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-stone-900 truncate">{restaurant.name}</h3>
                    {restaurant.is_verified ? (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                            <Check size={10} /> Verified
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-500 rounded-full">
                            Pending
                        </span>
                    )}
                </div>

                {restaurant.address && (
                    <div className="flex items-center gap-1 text-sm text-stone-500 mb-2">
                        <MapPin size={12} />
                        <span className="truncate">{restaurant.address}</span>
                    </div>
                )}

                {restaurant.tags && restaurant.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {restaurant.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 text-xs bg-green-50 text-green-600 rounded-full">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                {restaurant.rating && (
                    <div className="flex items-center gap-1 text-sm text-stone-600">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        {restaurant.rating}
                    </div>
                )}
                <FavoriteButton
                    restaurantId={restaurant.id}
                    initialFavorited={true}
                    size={18}
                />
            </div>
        </div>
    );
}
