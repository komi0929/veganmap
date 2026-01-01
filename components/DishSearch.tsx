'use client';

import { useState } from 'react';
import { Search, Utensils, MapPin, Star, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface DishSearchResult {
    id: string;
    name: string;
    address: string;
    rating: number | null;
    photos: string[] | null;
    matchingDishes: string[];
    matchCount: number;
    inbound_scores?: {
        veganConfidence: number;
        englishFriendly: number;
    };
}

interface DishSearchProps {
    onSelectRestaurant?: (restaurantId: string) => void;
}

export default function DishSearch({ onSelectRestaurant }: DishSearchProps) {
    const t = useTranslations('Search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<DishSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (query.length < 2) return;

        setIsLoading(true);
        setHasSearched(true);

        try {
            const response = await fetch(`/api/search/dishes?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success) {
                setResults(data.results || []);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    // Popular dish suggestions
    const suggestions = ['ramen', 'curry', 'burger', 'sushi', 'matcha', 'tofu'];

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Search Box */}
            <div className="relative mb-6">
                <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg border border-stone-200 px-4 py-3">
                    <Utensils className="text-green-600 shrink-0" size={20} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Search dishes (e.g., ramen, curry, tofu)"
                        className="flex-1 outline-none text-stone-800 placeholder-stone-400"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || query.length < 2}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white p-2 rounded-xl transition-colors"
                    >
                        <Search size={18} />
                    </button>
                </div>
            </div>

            {/* Quick Suggestions */}
            {!hasSearched && (
                <div className="mb-6">
                    <p className="text-sm text-stone-500 mb-2">Popular searches:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map(dish => (
                            <button
                                key={dish}
                                onClick={() => {
                                    setQuery(dish);
                                    setTimeout(() => handleSearch(), 100);
                                }}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-green-100 text-stone-700 hover:text-green-700 rounded-full text-sm transition-colors"
                            >
                                {dish}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-stone-500 mt-2">Searching...</p>
                </div>
            )}

            {/* Results */}
            {!isLoading && hasSearched && (
                <div className="space-y-4">
                    {results.length === 0 ? (
                        <div className="text-center py-8 bg-stone-50 rounded-xl">
                            <Utensils className="mx-auto text-stone-300 mb-2" size={40} />
                            <p className="text-stone-500">No restaurants found with "{query}"</p>
                            <p className="text-sm text-stone-400 mt-1">Try a different dish name</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-stone-500">
                                Found <span className="font-medium text-green-600">{results.length}</span> restaurants with "{query}"
                            </p>

                            {results.map(restaurant => (
                                <div
                                    key={restaurant.id}
                                    onClick={() => onSelectRestaurant?.(restaurant.id)}
                                    className="flex gap-4 p-4 bg-white rounded-xl shadow-md border border-stone-100 hover:border-green-300 cursor-pointer transition-all hover:shadow-lg"
                                >
                                    {/* Photo */}
                                    <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-stone-100">
                                        {restaurant.photos && restaurant.photos[0] ? (
                                            <img
                                                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photo_reference=${restaurant.photos[0]}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                                                alt={restaurant.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Utensils className="text-stone-300" size={32} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-stone-800 truncate">{restaurant.name}</h3>

                                        {/* Matching Dishes */}
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {restaurant.matchingDishes.map((dish, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    {dish}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Meta */}
                                        <div className="flex items-center gap-3 mt-2 text-sm text-stone-500">
                                            {restaurant.rating && (
                                                <span className="flex items-center gap-1">
                                                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                                    {restaurant.rating}
                                                </span>
                                            )}
                                            {restaurant.inbound_scores?.veganConfidence && restaurant.inbound_scores.veganConfidence >= 70 && (
                                                <span className="text-green-600 text-xs">🌱 Vegan {restaurant.inbound_scores.veganConfidence}%</span>
                                            )}
                                        </div>
                                    </div>

                                    <ArrowRight className="text-stone-300 shrink-0 self-center" size={20} />
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
