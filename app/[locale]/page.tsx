import { useTranslations } from 'next-intl';
import RestaurantList from '@/components/RestaurantList';
import RestaurantDetail from '@/components/RestaurantDetail';
import LanguageToggle from '@/components/LanguageToggle';
import PlacesSearch from '@/components/PlacesSearch';
import AddRestaurantForm from '@/components/AddRestaurantForm';
import { Search, Plus, Settings, Heart, Grid, Map as MapIcon, List } from 'lucide-react';
import Link from 'next/link';
import Map from '@/components/Map';
import MobileRestaurantCarousel from '@/components/MobileRestaurantCarousel';
import DishGallery from '@/components/DishGallery';
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

type ViewMode = 'map' | 'gallery';

export default function Home() {
    const t = useTranslations('Index');
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [showPlacesSearch, setShowPlacesSearch] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('map');

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

    const handleSelectRestaurant = (restaurant: Restaurant, source: 'list' | 'map' | 'gallery' = 'list') => {
        setSelectedRestaurant(restaurant);
        if (searchQuery.trim()) {
            // Log the search interaction for self-evolution
            import('@/lib/actions/analytics').then(mod => {
                mod.logSearchClick(searchQuery, restaurant.id, source);
            });
        }
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
        <main className="flex min-h-screen relative flex-col md:flex-row overflow-hidden bg-stone-50">
            <LanguageToggle />

            {/* Mobile Header (Floating) */}
            <div className={`md:hidden absolute top-0 left-0 right-0 z-30 p-4 transition-all duration-300 ${viewMode === 'gallery' ? 'bg-white shadow-sm' : 'bg-gradient-to-b from-black/50 to-transparent pointer-events-none'}`}>
                <div className="pointer-events-auto flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-3 bg-white/90 backdrop-blur-md shadow-lg border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-stone-400"
                        />
                        <Search className="absolute left-3 top-3.5 text-stone-400" size={18} />
                    </div>

                    {/* View Toggle (Map <-> Gallery) */}
                    <button
                        onClick={() => setViewMode(prev => prev === 'map' ? 'gallery' : 'map')}
                        className={`p-3 backdrop-blur-md shadow-lg rounded-2xl active:scale-95 transition-all
                            ${viewMode === 'gallery' ? 'bg-stone-900 text-white' : 'bg-white/90 text-stone-700'}
                        `}
                    >
                        {viewMode === 'map' ? <Grid size={20} /> : <MapIcon size={20} />}
                    </button>

                    <Link
                        href="/wishlist"
                        className="p-3 bg-white/90 backdrop-blur-md shadow-lg text-red-500 rounded-2xl active:scale-95 transition-transform"
                    >
                        <Heart size={20} className={restaurants.some(r => false) ? "fill-red-500" : ""} />
                    </Link>
                </div>
            </div>

            {/* Desktop Sidebar / List View (Hidden on Mobile) */}
            <div className="hidden md:flex w-full md:w-[400px] h-screen flex-col bg-white z-10 shadow-xl border-r border-stone-100 shrink-0">
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
                                href="/wishlist"
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                title={t('wishlist')}
                            >
                                <Heart size={18} />
                            </Link>
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

                    {/* Desktop View Toggles */}
                    <div className="flex bg-stone-100 p-1 rounded-xl mt-4">
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${viewMode === 'map' ? 'bg-white shadow text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            <List size={14} /> List
                        </button>
                        <button
                            onClick={() => setViewMode('gallery')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${viewMode === 'gallery' ? 'bg-white shadow text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            <Grid size={14} /> Gallery
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden relative">
                    {viewMode === 'map' ? (
                        <RestaurantList
                            restaurants={filteredRestaurants}
                            onSelect={(r) => handleSelectRestaurant(r, 'list')}
                            selectedId={selectedRestaurant?.id}
                        />
                    ) : (
                        <DishGallery
                            restaurants={filteredRestaurants}
                            onSelect={(r) => handleSelectRestaurant(r, 'gallery')}
                        />
                    )}
                </div>
            </div>

            {/* Map View (Full screen on Mobile, Right side on Desktop) */}
            <div className={`absolute inset-0 md:static md:flex-1 h-screen bg-stone-200 z-0 transition-transform duration-300 md:transform-none ${viewMode === 'gallery' ? 'translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
                <Map
                    restaurants={filteredRestaurants}
                    onMarkerClick={(r) => handleSelectRestaurant(r, 'map')}
                    selectedId={selectedRestaurant?.id}
                />
            </div>

            {/* Mobile Gallery View (Overlay) */}
            {viewMode === 'gallery' && (
                <div className="md:hidden absolute inset-0 z-10 pt-20 bg-stone-50 animate-in slide-in-from-bottom duration-300">
                    <DishGallery
                        restaurants={filteredRestaurants}
                        onSelect={(r) => handleSelectRestaurant(r, 'gallery')}
                    />
                </div>
            )}

            {/* Mobile Carousel (Bottom Overlay) - Only show in Map Mode */}
            <div className="md:hidden">
                {viewMode === 'map' && (
                    <MobileRestaurantCarousel
                        restaurants={filteredRestaurants}
                        onSelect={(r) => handleSelectRestaurant(r, 'list')}
                        selectedId={selectedRestaurant?.id}
                    />
                )}
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


