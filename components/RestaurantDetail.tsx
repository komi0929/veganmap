'use client';

import { useState, useEffect } from 'react';
import { Phone, MapPin, X, Globe, Copy, Check, Instagram, Facebook, Star, Clock, Utensils, ExternalLink, RefreshCw, MessageSquare, Calendar, Sparkles, Heart, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Restaurant } from '@/lib/types';
import { useTranslations, useLocale } from 'next-intl';
import ReservationForm from './ReservationForm';
import ConciergeModal from './ConciergeModal';
import { syncRestaurantIfNeeded, getPredictiveMenuItems, formatLastSyncTime, RestaurantWithSync, ReviewSnippet } from '@/lib/restaurantSync';
import { format } from 'date-fns';
import { enUS, ja } from 'date-fns/locale';
import Image from 'next/image';

// Helper to detect SNS
const getSocialLink = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.includes('instagram.com')) return { type: 'instagram', icon: <Instagram size={18} />, label: 'Instagram', color: 'text-pink-600 bg-pink-50 hover:bg-pink-100' };
    if (url.includes('facebook.com')) return { type: 'facebook', icon: <Facebook size={18} />, label: 'Facebook', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' };
    return { type: 'website', icon: <Globe size={18} />, label: 'Website', color: 'text-stone-600 bg-stone-100 hover:bg-stone-200' };
};

interface RestaurantDetailProps {
    restaurant: Restaurant | null;
    allRestaurants?: Restaurant[];
    onClose: () => void;
    onNavigate?: (restaurant: Restaurant) => void;
}

export default function RestaurantDetail({ restaurant, allRestaurants = [], onClose, onNavigate }: RestaurantDetailProps) {
    const t = useTranslations('Detail');
    const locale = useLocale();
    const [showReservation, setShowReservation] = useState(false);
    const [showConcierge, setShowConcierge] = useState(false);
    const [syncedData, setSyncedData] = useState<RestaurantWithSync | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    // Social State
    const [user, setUser] = useState<any>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isVisited, setIsVisited] = useState(false);

    useEffect(() => {
        // Check Auth
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user && restaurant) {
                checkSocialStatus(session.user.id, restaurant.id);
            }
        });
    }, [restaurant]);

    const checkSocialStatus = async (userId: string, restaurantId: string) => {
        const { data: bookmark } = await supabase.from('bookmarks').select('*').eq('user_id', userId).eq('restaurant_id', restaurantId).single();
        const { data: visit } = await supabase.from('visits').select('*').eq('user_id', userId).eq('restaurant_id', restaurantId).single();
        setIsBookmarked(!!bookmark);
        setIsVisited(!!visit);
    };

    const toggleBookmark = async () => {
        if (!user || !restaurant) {
            alert("Please Sign In first!"); // Simple prompt for now
            return;
        }
        if (isBookmarked) {
            await (supabase as any).from('bookmarks').delete().eq('user_id', user.id).eq('restaurant_id', restaurant.id);
            setIsBookmarked(false);
        } else {
            await (supabase as any).from('bookmarks').insert({ user_id: user.id, restaurant_id: restaurant.id });
            setIsBookmarked(true);
        }
    };

    const toggleVisit = async () => {
        if (!user || !restaurant) {
            alert("Please Sign In first!");
            return;
        }
        if (isVisited) {
            await (supabase as any).from('visits').delete().eq('user_id', user.id).eq('restaurant_id', restaurant.id);
            setIsVisited(false);
        } else {
            await (supabase as any).from('visits').insert({ user_id: user.id, restaurant_id: restaurant.id });
            setIsVisited(true);
        }
    };

    // Reset synced data when restaurant changes
    useEffect(() => {
        setSyncedData(null);
    }, [restaurant?.id]);

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
    const photos = (displayData as any).photos as string[] || [];
    const priceLevel = (displayData as any).price_level;
    const phoneNumber = (displayData as any).phone_number;
    const googleMapsUri = (displayData as any).google_maps_uri;

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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                {/* Header / Photo Gallery */}
                <div className="relative h-56 bg-gradient-to-br from-green-400 to-emerald-600 shrink-0">
                    {photos.length > 0 ? (
                        <div className="flex h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                            {photos.slice(0, 5).map((photoRef, i) => (
                                <img
                                    key={i}
                                    src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                                    alt={displayData.name}
                                    className="h-full w-full object-cover shrink-0 snap-center"
                                />
                            ))}
                        </div >
                    ) : (
                        <div className="h-full w-full bg-gradient-to-br from-green-400 to-emerald-600" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/40 rounded-full transition-colors z-10"
                    >
                        <X className="text-white" size={20} />
                    </button>

                    <div className="absolute bottom-4 left-4 right-4 z-10">
                        {/* Action Buttons (SNS Smart-Link) */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar">
                            {/* Phone */}
                            {displayData.phone_number && (
                                <a href={`tel:${displayData.phone_number}`} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-xl font-medium transition-colors hover:bg-green-100">
                                    <Phone size={18} />
                                    <span className="whitespace-nowrap">Call</span>
                                </a>
                            )}

                            {/* Google Maps (Always available if uri exists) */}
                            {displayData.google_maps_uri && (
                                <a href={displayData.google_maps_uri} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium transition-colors hover:bg-blue-100">
                                    <MapPin size={18} />
                                    <span className="whitespace-nowrap">Maps</span>
                                </a>
                            )}

                            {/* Dynamic Social Link (Instagram/FB/Web) */}
                            {(() => {
                                const social = getSocialLink(displayData.website);
                                if (social) {
                                    return (
                                        <a href={displayData.website!} target="_blank" rel="noopener noreferrer" className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${social.color}`}>
                                            {social.icon}
                                            <span className="whitespace-nowrap">{social.label}</span>
                                        </a>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <h2 className="text-2xl font-bold text-white drop-shadow-md">
                            {displayData.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {displayData.is_verified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-full backdrop-blur-md">
                                    <Check size={12} /> {t('verified')}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-full backdrop-blur-md">
                                    <Clock size={12} /> {t('pending')}
                                </span>
                            )}
                            {rating && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-full backdrop-blur-md">
                                    <Star size={12} className="fill-current" /> {rating}
                                </span>
                            )}
                            {priceLevel !== undefined && priceLevel !== null && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-full backdrop-blur-md font-medium">
                                    {'¥'.repeat(priceLevel || 1)}
                                </span>
                            )}
                            {isSyncing && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-full backdrop-blur-md">
                                    <RefreshCw size={12} className="animate-spin" /> {t('syncing')}
                                </span>
                            )}
                            {/* Vibe Tags */}
                            {displayData.vibe_tags && displayData.vibe_tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/80 text-white rounded-full backdrop-blur-md shadow-sm border border-purple-300/30">
                                    ✨ {tag}
                                </span>
                            ))}
                            {/* Local vs Tourist Badge */}

                            {/* Social Actions */}
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={toggleBookmark}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition ${isBookmarked ? 'bg-pink-500 text-white shadow-md' : 'bg-white/50 text-stone-600 hover:bg-white border border-stone-200'}`}
                                >
                                    <Heart size={16} className={isBookmarked ? 'fill-white' : ''} />
                                    {isBookmarked ? 'Saved' : 'Want to Go'}
                                </button>
                                <button
                                    onClick={toggleVisit}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition ${isVisited ? 'bg-green-500 text-white shadow-md' : 'bg-white/50 text-stone-600 hover:bg-white border border-stone-200'}`}
                                >
                                    <CheckCircle size={16} className={isVisited ? 'fill-white' : ''} />
                                    {isVisited ? 'Visited' : 'Have been'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div >

                {/* Content */}
                < div className="p-6 space-y-5 overflow-y-auto" >

                    {/* Inbound Scores - Tourist Intelligence */}
                    {displayData.inbound_scores && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(displayData.inbound_scores?.englishFriendly ?? 0) >= 50 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                    🌍 English OK {displayData.inbound_scores.englishFriendly}%
                                </span>
                            )}
                            {(displayData.inbound_scores?.cardsAccepted ?? 0) >= 50 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                                    💳 Cards OK
                                </span>
                            )}
                            {(displayData.inbound_scores?.veganConfidence ?? 0) >= 70 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
                                    🌱 Vegan Verified {displayData.inbound_scores.veganConfidence}%
                                </span>
                            )}
                            {(displayData.inbound_scores?.touristPopular ?? 0) >= 50 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                                    👤 Tourist Favorite
                                </span>
                            )}
                        </div>
                    )}

                    {/* AI Summary - Multilingual */}
                    {(() => {
                        const multiSummary = displayData.multilingual_summary as { ja?: string[]; en?: string[]; ko?: string[]; zh?: string[] } | undefined;
                        const fallbackSummary = displayData.ai_summary?.pros;

                        // Get summary for current locale, fallback to Japanese, then English, then old format
                        let summaryItems: string[] = [];
                        if (multiSummary) {
                            if (locale === 'ja' && multiSummary.ja?.length) summaryItems = multiSummary.ja;
                            else if (locale === 'en' && multiSummary.en?.length) summaryItems = multiSummary.en;
                            else if (locale === 'ko' && multiSummary.ko?.length) summaryItems = multiSummary.ko;
                            else if (locale === 'zh-TW' && multiSummary.zh?.length) summaryItems = multiSummary.zh;
                            else if (multiSummary.en?.length) summaryItems = multiSummary.en;
                            else if (multiSummary.ja?.length) summaryItems = multiSummary.ja;
                        }
                        if (summaryItems.length === 0 && fallbackSummary?.length) {
                            summaryItems = fallbackSummary;
                        }

                        if (summaryItems.length === 0) return null;

                        return (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <MessageSquare size={80} />
                                </div>
                                <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                                    <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">AI Summary</span>
                                    Highlights
                                </h3>
                                <div className="space-y-3 relative z-10">
                                    <div className="flex gap-2">
                                        <span className="shrink-0 text-green-600 bg-green-100 rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">✓</span>
                                        <div>
                                            <ul className="text-sm text-stone-700 list-disc list-inside marker:text-green-300">
                                                {summaryItems.map((p: string, i: number) => <li key={i}>{p}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Address & Phone */}
                    < div className="space-y-3" >
                        <div className="flex items-start gap-3">
                            <MapPin className="text-stone-400 mt-1 shrink-0" size={18} />
                            <div>
                                <p className="text-sm text-stone-500">{t('address')}</p>
                                <p className="text-stone-800 leading-relaxed">{displayData.address || t('unknownLocation')}</p>
                            </div>
                        </div>
                        {
                            phoneNumber && (
                                <div className="flex items-start gap-3">
                                    <ExternalLink className="text-stone-400 mt-1 shrink-0 rotate-90" size={18} />
                                    <div>
                                        <p className="text-sm text-stone-500">Phone</p>
                                        <a href={`tel:${phoneNumber}`} className="text-stone-800 hover:text-green-600 transition-colors">
                                            {phoneNumber}
                                        </a>
                                    </div>
                                </div>
                            )
                        }
                    </div >

                    <div className="h-px bg-stone-100" />

                    {/* Opening Hours */}
                    {
                        openingHours && openingHours.length > 0 && (
                            <div className="flex items-start gap-3">
                                <Clock className="text-stone-400 mt-1 shrink-0" size={18} />
                                <div>
                                    <p className="text-sm text-stone-500">{t('openingHours')}</p>
                                    <div className="text-sm text-stone-700 space-y-1 mt-1">
                                        {openingHours.slice(0, 3).map((hours: string, i: number) => (
                                            <p key={i}>{hours}</p>
                                        ))}
                                        {openingHours.length > 3 && (
                                            <details className="group">
                                                <summary className="text-stone-400 hover:text-stone-600 cursor-pointer text-xs mt-1 list-none flex items-center gap-1">
                                                    Show all hours
                                                </summary>
                                                <div className="mt-1 space-y-1">
                                                    {openingHours.slice(3).map((hours: string, i: number) => (
                                                        <p key={i}>{hours}</p>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Tags */}
                    {
                        displayData.tags && displayData.tags.length > 0 && (
                            <div>
                                <p className="text-sm text-stone-500 mb-2">{t('tags')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {displayData.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1 text-sm bg-stone-100 text-stone-600 rounded-full border border-stone-200"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )
                    }

                    {/* Dietary Tags (Highlighted) */}
                    {
                        dietaryTags && Object.entries(dietaryTags).some(([_, v]) => v) && (
                            <div>
                                <p className="text-sm text-stone-500 mb-2">{t('dietaryOptions')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(dietaryTags).map(([key, value]) =>
                                        value ? (
                                            <span
                                                key={key}
                                                className="px-3 py-1 text-sm bg-purple-50 text-purple-700 rounded-full border border-purple-200 font-medium"
                                            >
                                                ✓ {key.replace('_', ' ')}
                                            </span>
                                        ) : null
                                    )}
                                </div>
                            </div>
                        )
                    }


                    {/* Real Menu (Mined from Reviews) */}
                    {
                        (displayData.real_menu && displayData.real_menu.length > 0) ? (
                            <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Utensils size={16} className="text-orange-600" />
                                    <p className="text-sm font-medium text-orange-900">
                                        {t('popularDishes')} <span className="text-orange-600/70 text-xs font-normal">({t('fromReviews')})</span>
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {displayData.real_menu.map((item: any) => (
                                        <div key={item.name} className="flex items-center justify-between text-sm bg-white/60 p-2 rounded-lg">
                                            <span className="font-medium text-stone-800">{item.name}</span>
                                            <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Star size={10} className="fill-orange-600" /> {item.count} {t('mentions')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : predictiveItems.length > 0 && (
                            // Fallback to Predictive Menu
                            <div className="p-4 bg-gradient-to-r from-stone-50 to-gray-50 rounded-xl border border-stone-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Utensils size={16} className="text-stone-400" />
                                    <p className="text-sm font-medium text-stone-600">{t('likelyAvailable')}</p>
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
                        )
                    }

                    {/* Cached Reviews */}
                    {
                        cachedReviews.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageSquare size={16} className="text-stone-400" />
                                    <p className="text-sm text-stone-500">{t('reviewHighlights')}</p>
                                </div>
                                <div className="space-y-3">
                                    {cachedReviews.map((review, i) => (
                                        <div key={i} className="p-4 bg-stone-50 rounded-xl text-sm border border-stone-100">
                                            <div className="flex items-center gap-1 mb-2">
                                                {Array.from({ length: Math.round(review.rating || 5) }).map((_, j) => (
                                                    <Star key={j} size={12} className="text-yellow-400 fill-yellow-400" />
                                                ))}
                                            </div>
                                            <p className="text-stone-700 italic leading-relaxed">"{review.text}"</p>
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {review.keywords?.map(kw => (
                                                    <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded uppercase tracking-wide">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }

                    {/* Google Maps Link */}
                    <a
                        href={googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${restaurant.google_place_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors font-medium"
                    >
                        <ExternalLink size={16} />
                        {t('openInMaps')}
                    </a>

                    {/* Last Synced */}
                    {
                        lastSynced && (
                            <p className="text-xs text-stone-400 text-center">
                                {t('lastUpdated')}: {formatLastSyncTime(lastSynced)}
                            </p>
                        )
                    }
                </div >

                {/* Footer */}
                < div className="p-4 border-t border-stone-100 bg-stone-50/50 shrink-0" >
                    <button
                        onClick={() => setShowReservation(true)}
                        className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-lg shadow-green-200 font-medium flex items-center justify-center gap-2 transform active:scale-[0.98]"
                    >
                        <Calendar size={18} />
                        {t('makeReservation')}
                    </button>
                </div >
            </div >
            {/* Concierge Modal */}
            {showConcierge && restaurant && (
                <ConciergeModal
                    anchor={restaurant}
                    candidates={allRestaurants}
                    onClose={() => setShowConcierge(false)}
                    onSelect={(r) => {
                        setShowConcierge(false);
                        onNavigate?.(r);
                    }}
                />
            )}

            {/* Floating Concierge Button */}
            <div className="absolute bottom-6 right-6 z-40">
                <button
                    onClick={() => setShowConcierge(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition font-bold"
                >
                    <Sparkles size={20} className="fill-white/20" />
                    Next Stop?
                </button>
            </div>
        </div >
    );
}
