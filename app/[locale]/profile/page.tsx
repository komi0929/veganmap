'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Restaurant, Bookmark, Visit } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Star, MapPin, Share2 } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [bookmarks, setBookmarks] = useState<(Bookmark & { restaurants: Restaurant })[]>([]);
    const [visits, setVisits] = useState<(Visit & { restaurants: Restaurant })[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/');
                return;
            }
            setUser(session.user);

            // Fetch Bookmarks
            const { data: bData } = await supabase
                .from('bookmarks')
                .select('*, restaurants(*)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (bData) setBookmarks(bData as any);

            // Fetch Visits
            const { data: vData } = await supabase
                .from('visits')
                .select('*, restaurants(*)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (vData) setVisits(vData as any);
            setLoading(false);
        };

        fetchUserData();
    }, [router]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const shareUrl = `${window.location.origin}/lists/${user.id}`;

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="p-2 -ml-2 hover:bg-stone-100 rounded-full text-stone-600">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="font-bold text-lg text-stone-800">My Gourmet Map</h1>
                    <div className="w-10" />
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
                {/* Profile Section */}
                <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                    <div className="w-16 h-16 bg-stone-200 rounded-full overflow-hidden">
                        {user.user_metadata.avatar_url && (
                            <Image src={user.user_metadata.avatar_url} alt="Profile" width={64} height={64} />
                        )}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-stone-800">{user.user_metadata.full_name || 'User'}</h2>
                        <p className="text-sm text-stone-500">{bookmarks.length} Want to Go · {visits.length} Visited</p>
                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(shareUrl);
                            alert('Copied Public List URL!');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-bold shadow-md hover:scale-105 transition"
                    >
                        <Share2 size={16} />
                        Share List
                    </button>
                </div>

                {/* Want to Go */}
                <section>
                    <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                        <span className="text-pink-500">❤️</span> Want to Go ({bookmarks.length})
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {bookmarks.map(item => (
                            <RestaurantCard key={item.id} restaurant={item.restaurants} />
                        ))}
                        {bookmarks.length === 0 && (
                            <p className="text-stone-400 text-sm col-span-2 py-4">No bookmarks yet. Go explore!</p>
                        )}
                    </div>
                </section>

                {/* Visited */}
                <section>
                    <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                        <span className="text-green-500">✅</span> Visited ({visits.length})
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {visits.map(item => (
                            <RestaurantCard key={item.id} restaurant={item.restaurants} />
                        ))}
                        {visits.length === 0 && (
                            <p className="text-stone-400 text-sm col-span-2 py-4">No visits recorded yet.</p>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
    if (!restaurant) return null;
    return (
        <Link href={`/?id=${restaurant.id}`} className="block bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-md transition group">
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
        </Link>
    );
}
