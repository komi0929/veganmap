import { useState, useMemo } from 'react';
import { Restaurant } from '@/lib/types';
import { X, MapPin, Coffee, Wine, Leaf, Utensils, ArrowRight, Sparkles, Star } from 'lucide-react';
import Image from 'next/image';

interface ConciergeModalProps {
    anchor: Restaurant;
    candidates: Restaurant[];
    onClose: () => void;
    onSelect: (restaurant: Restaurant) => void;
}

type Intent = 'chill' | 'drink' | 'reset' | 'meal';

export default function ConciergeModal({ anchor, candidates, onClose, onSelect }: ConciergeModalProps) {
    const [intent, setIntent] = useState<Intent | null>(null);
    const [walkableOnly, setWalkableOnly] = useState(false);

    // Haversine Distance
    const getDistance = (r1: Restaurant, r2: Restaurant) => {
        if (!r1.latitude || !r1.longitude || !r2.latitude || !r2.longitude) return Infinity;
        const R = 6371e3; // metres
        const φ1 = r1.latitude * Math.PI / 180;
        const φ2 = r2.latitude * Math.PI / 180;
        const Δφ = (r2.latitude - r1.latitude) * Math.PI / 180;
        const Δλ = (r2.longitude - r1.longitude) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // in meters
    };

    const suggestions = useMemo(() => {
        if (!intent) return [];

        return candidates
            .filter(r => r.id !== anchor.id) // Exclude self
            .map(r => {
                const dist = getDistance(anchor, r);
                let score = 1.0;

                // 1. Distance Logic
                if (walkableOnly && dist > 1000) return null; // Filter out if too far

                // Decay score by distance (closer is better, but not strict)
                score += Math.max(0, (2000 - dist) / 500);

                // 2. Intent Bonus
                const name = r.name.toLowerCase();
                const vibes = (r.vibe_tags || []).map(t => t.toLowerCase());

                if (intent === 'chill') {
                    // Cafe, Quiet, Work Friendly
                    if (name.includes('cafe') || name.includes('coffee') || name.includes('tea')) score += 5;
                    if (vibes.includes('quiet') || vibes.includes('work friendly') || vibes.includes('romantic')) score += 3;
                } else if (intent === 'drink') {
                    // Lively, Alcohol (inferred), Late night
                    if (vibes.includes('lively') || vibes.includes('solo friendly')) score += 3;
                    if (name.includes('bar') || name.includes('izakaya') || name.includes('beer')) score += 5;
                } else if (intent === 'reset') {
                    // Salad, Healthy, Juice
                    if (name.includes('salad') || name.includes('bowl') || name.includes('smoothie')) score += 5;
                    if (r.dietary_tags?.vegan || r.dietary_tags?.raw) score += 2;
                } else if (intent === 'meal') {
                    // Proper food
                    if (!name.includes('cafe') && !name.includes('bar')) score += 3;
                    if (vibes.includes('family friendly')) score += 2;
                }

                return { restaurant: r, score, dist };
            })
            .filter((item): item is { restaurant: Restaurant, score: number, dist: number } => item !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // Top 3

    }, [anchor, candidates, intent, walkableOnly]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-md w-full max-w-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div>
                        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                            <Sparkles className="text-purple-600 fill-current" size={18} />
                            AI Concierge
                        </h2>
                        <p className="text-xs text-stone-500">Next stop from <span className="font-semibold text-stone-700">{anchor.name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-stone-100 transition shadow-sm">
                        <X size={18} className="text-stone-500" />
                    </button>
                </div>

                {/* Intent Selection */}
                <div className="p-5 space-y-4 overflow-y-auto">
                    {!intent ? (
                        <div className="space-y-4">
                            <p className="text-center text-stone-600 font-medium">How are you feeling?</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setIntent('chill')} className="p-4 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 transition text-left group">
                                    <Coffee className="text-orange-500 mb-2 group-hover:scale-110 transition" />
                                    <div className="font-bold text-stone-800">Chill / Cafe</div>
                                    <div className="text-xs text-stone-500">Relax, Coffee, Sweets</div>
                                </button>
                                <button onClick={() => setIntent('drink')} className="p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition text-left group">
                                    <Wine className="text-indigo-500 mb-2 group-hover:scale-110 transition" />
                                    <div className="font-bold text-stone-800">Drink</div>
                                    <div className="text-xs text-stone-500">Lively, Alcohol, Bar</div>
                                </button>
                                <button onClick={() => setIntent('reset')} className="p-4 rounded-2xl bg-green-50 hover:bg-green-100 border border-green-200 transition text-left group">
                                    <Leaf className="text-green-500 mb-2 group-hover:scale-110 transition" />
                                    <div className="font-bold text-stone-800">Reset</div>
                                    <div className="text-xs text-stone-500">Light, Healthy, Salad</div>
                                </button>
                                <button onClick={() => setIntent('meal')} className="p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 transition text-left group">
                                    <Utensils className="text-stone-500 mb-2 group-hover:scale-110 transition" />
                                    <div className="font-bold text-stone-800">Proper Meal</div>
                                    <div className="text-xs text-stone-500">Hungry, Lunch/Dinner</div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Filter Toggle */}
                            <div className="flex items-center justify-between px-1">
                                <button onClick={() => setIntent(null)} className="text-xs text-stone-400 hover:text-stone-600 font-medium">
                                    ← Change Mood
                                </button>
                                <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                                    <input type="checkbox" checked={walkableOnly} onChange={e => setWalkableOnly(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
                                    Walkable Only (&lt;1km)
                                </label>
                            </div>

                            {/* Suggestions */}
                            <div className="space-y-3">
                                {suggestions.length > 0 ? (
                                    suggestions.map(({ restaurant, score, dist }) => (
                                        <div
                                            key={restaurant.id}
                                            onClick={() => onSelect(restaurant)}
                                            className="group flex gap-3 p-3 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-purple-200 transition cursor-pointer"
                                        >
                                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 relative shrink-0">
                                                {restaurant.photos && restaurant.photos[0] ? (
                                                    <Image src={restaurant.photos[0]} alt={restaurant.name} fill className="object-cover group-hover:scale-105 transition duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-stone-300">No Img</div>
                                                )}
                                                {dist < 500 && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-0.5 text-center backdrop-blur-sm">
                                                        {Math.round(dist)}m
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-stone-800 truncate pr-2 group-hover:text-purple-700 transition">{restaurant.name}</h3>
                                                    <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                                                        <Star size={10} className="fill-current" /> {restaurant.rating}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {restaurant.vibe_tags?.slice(0, 2).map(tag => (
                                                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded-md">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="mt-2 text-xs text-stone-400 flex items-center gap-1 group-hover:text-purple-600 transition">
                                                    View Details <ArrowRight size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-stone-400 text-sm">
                                        No matching spots found nearby...<br />Try turning off the distance filter?
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
