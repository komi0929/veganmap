'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Restaurant, Bookmark, Visit } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Star, MapPin } from 'lucide-react';
import Image from 'next/image';

interface PublicListPageProps {
    params: {
        userId: string;
    }
}

export default function PublicListPage({ params }: PublicListPageProps) {
    const { userId } = params;
    const [bookmarks, setBookmarks] = useState<(Bookmark & { restaurants: Restaurant })[]>([]);
    const [visits, setVisits] = useState<(Visit & { restaurants: Restaurant })[]>([]);
    const [loading, setLoading] = useState(true);
    // Note: We can't easily get user profile (avatar/name) unless we have a 'profiles' table or fetch from auth admin (not possible client side).
    // For MVP, we might display "User's List" or try to fetch if we had a public profiles table.
    // However, I can try to fetch one bookmark join to see if I can get user info? No, auth.users is not queryable.
    // Solution: Phase 8 requires a 'profiles' table usually. 
    // Workaround: I'll just show "Gourmet List" for now. Or relying on a profiles table I should create?
    // Let's create a `profiles` table in migration if we want names.
    // For now, simple "Gourmet List".

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Bookmarks
            const { data: bData } = await supabase
                .from('bookmarks')
                .select('*, restaurants(*)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (bData) setBookmarks(bData as any);

            // Fetch Visits
            const { data: vData } = await supabase
                .from('visits')
                .select('*, restaurants(*)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (vData) setVisits(vData as any);
            setLoading(false);
        };

        fetchData();
    }, [userId]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg text-stone-800 hover:opacity-70">
                        <ArrowLeft size={20} /> Back to Map
                    </Link>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
                {/* Profile Header */}
                <div className="bg-black text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold mb-2">Gourmet Collection</h1>
                        <p className="opacity-80">Curated List</p>
                        <div className="mt-6 flex gap-4 text-sm font-bold">
                            <span className="bg-white/20 px-3 py-1 rounded-full">❤️ {bookmarks.length} Favorites</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">✅ {visits.length} Visited</span>
                        </div>
                    </div>
                    {/* Decorative Background */}
                    <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-3xl opacity-30"></div>
                </div>

                {/* Want to Go */}
                {bookmarks.length > 0 && (
                    <section>
                        <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                            Want to Go
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {bookmarks.map(item => (
                                <RestaurantCard key={item.id} restaurant={item.restaurants} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Visited */}
                {visits.length > 0 && (
                    <section>
                        <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                            Visited Spots
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {visits.map(item => (
                                <RestaurantCard key={item.id} restaurant={item.restaurants} />
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
    if (!restaurant) return null;
    return (
        <a href={`/?id=${restaurant.id}`} className="block bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-md transition group">
            <div className="h-32 bg-stone-100 relative">
                {restaurant.photos && restaurant.photos[0] ? (
                    <Image src={restaurant.photos[0]} alt={restaurant.name} fill className="object-cover" />
                ) : null}
                <div className="absolute top-2 right-2 flex gap-1">
                    <span className="bg-white/90 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                        <Star size={10} className="fill-current" /> {restaurant.rating}
                    </span>
                </div>
            </div>
            <div className="p-3">
                <h4 className="font-bold text-stone-800 truncate group-hover:text-amber-600 transition">{restaurant.name}</h4>
                <div className="flex items-center text-xs text-stone-500 mt-1 gap-1">
                    <MapPin size={12} />
                    <span className="truncate">{restaurant.address}</span>
                </div>
            </div>
        </a>
    );
}
