'use client';

import { useState } from 'react';
import { Search, Loader2, MapPin, Star, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PlaceResult {
    place_id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    rating?: number;
    user_ratings_total?: number;
}

interface PlacesSearchProps {
    onSelect: (place: PlaceResult) => void;
    onClose: () => void;
}

export default function PlacesSearch({ onSelect, onClose }: PlacesSearchProps) {
    const t = useTranslations('PlacesSearch');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PlaceResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({ query });
            const response = await fetch(`/api/places/search?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }

            setResults(data.places || []);
        } catch (err) {
            console.error('Search error:', err);
            setError(t('searchError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-stone-900">{t('title')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-stone-500" />
                    </button>
                </div>

                {/* Search Input */}
                <div className="p-4 border-b border-stone-100">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('placeholder')}
                                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            />
                            <Search className="absolute left-3 top-3.5 text-stone-400" size={18} />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isLoading || !query.trim()}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Search size={18} />
                            )}
                            {t('searchButton')}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">{t('hint')}</p>
                </div>

                {/* Results */}
                <div className="overflow-y-auto max-h-[50vh] p-4">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
                            {error}
                        </div>
                    )}

                    {results.length === 0 && !isLoading && !error && (
                        <div className="text-center py-12 text-stone-500">
                            <MapPin size={48} className="mx-auto mb-4 opacity-30" />
                            <p>{t('noResults')}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {results.map((place) => (
                            <div
                                key={place.place_id}
                                className="p-4 bg-white border border-stone-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-stone-800">{place.name}</h3>
                                        <div className="flex items-center gap-1 mt-1 text-sm text-stone-500">
                                            <MapPin size={14} />
                                            <span>{place.address}</span>
                                        </div>
                                        {place.rating && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                <span className="text-sm font-medium">{place.rating}</span>
                                                {place.user_ratings_total && (
                                                    <span className="text-xs text-stone-400">
                                                        ({place.user_ratings_total} {t('reviews')})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onSelect(place)}
                                        className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                    >
                                        <Plus size={16} />
                                        {t('add')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
