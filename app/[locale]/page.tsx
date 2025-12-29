'use client';

import { useTranslations } from 'next-intl';
import RestaurantList from '@/components/RestaurantList';
import RestaurantDetail from '@/components/RestaurantDetail';
import LanguageToggle from '@/components/LanguageToggle';
import PlacesSearch from '@/components/PlacesSearch';
import AddRestaurantForm from '@/components/AddRestaurantForm';
import { Search, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import Map from '@/components/Map';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Restaurant } from '@/lib/types';

interface PlaceResult {
    place_id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
}

export default function Home() {
    const t = useTranslations('Index');
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [showPlacesSearch, setShowPlacesSearch] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

    const fetchRestaurants = useCallback(async () => {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*');

        if (error) {
            console.error('Error fetching restaurants:', error);
        } else if (data) {
            setRestaurants(data as any as Restaurant[]);
        }
    }, []);

    useEffect(() => {
        fetchRestaurants();
    }, [fetchRestaurants]);

    // Filter restaurants based on search query
    const filteredRestaurants = useMemo(() => {
        if (!searchQuery.trim()) return restaurants;

        const query = searchQuery.toLowerCase();
        return restaurants.filter(r =>
            r.name.toLowerCase().includes(query) ||
            r.address?.toLowerCase().includes(query) ||
            r.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    }, [restaurants, searchQuery]);

    const handleSelectRestaurant = (restaurant: Restaurant) => {
        setSelectedRestaurant(restaurant);
    };

    const handlePlaceSelect = (place: PlaceResult) => {
        setShowPlacesSearch(false);
        setSelectedPlace(place);
    };

    const handleAddSuccess = () => {
        setSelectedPlace(null);
        fetchRestaurants(); // Refresh the list
    };

    return (
        <main className="flex min-h-screen relative flex-col md:flex-row">
            <LanguageToggle />

            {/* Sidebar / List View */}
            <div className="w-full md:w-[400px] h-[50vh] md:h-screen flex flex-col bg-white z-10 shadow-xl border-r border-stone-100 order-2 md:order-1">
                <header className="p-4 border-b border-stone-100">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-stone-900 tracking-tight">{t('title')}</h1>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowPlacesSearch(true)}
                                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Plus size={16} />
                                {t('addRestaurant')}
                            </button>
                            <Link
                                href="/owner"
                                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
                                title={t('ownerDashboard')}
                            >
                                <Settings size={18} />
                            </Link>
                        </div>
                    </div>
                    <div className="mt-4 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-3 bg-stone-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all"
                        />
                        <Search className="absolute left-3 top-3.5 text-stone-400" size={18} />
                    </div>
                </header>

                <div className="flex-1 overflow-hidden relative">
                    <RestaurantList
                        restaurants={filteredRestaurants}
                        onSelect={handleSelectRestaurant}
                        selectedId={selectedRestaurant?.id}
                    />
                </div>
            </div>

            {/* Map View */}
            <div className="relative w-full md:flex-1 h-[50vh] md:h-screen bg-stone-200 order-1 md:order-2">
                <Map
                    restaurants={filteredRestaurants}
                    onMarkerClick={handleSelectRestaurant}
                    selectedId={selectedRestaurant?.id}
                />
            </div>

            {/* Detail Modal */}
            <RestaurantDetail
                restaurant={selectedRestaurant}
                onClose={() => setSelectedRestaurant(null)}
            />

            {/* Places Search Modal */}
            {showPlacesSearch && (
                <PlacesSearch
                    onSelect={handlePlaceSelect}
                    onClose={() => setShowPlacesSearch(false)}
                />
            )}

            {/* Add Restaurant Form */}
            {selectedPlace && (
                <AddRestaurantForm
                    place={selectedPlace}
                    onSuccess={handleAddSuccess}
                    onCancel={() => setSelectedPlace(null)}
                />
            )}
        </main>
    );
}


