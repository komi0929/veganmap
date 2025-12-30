'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Restaurant, Reservation } from '@/lib/types';
import AuthForm from '@/components/AuthForm';
import {
    Check,
    X,
    Clock,
    ChevronDown,
    Mail,
    User,
    Loader2,
    ArrowLeft,
    Utensils,
    LogOut
} from 'lucide-react';
import Link from 'next/link';



export default function OwnerDashboard() {
    const t = useTranslations('Owner');
    const { user, isLoading: authLoading, signIn, signUp, signOut } = useAuth();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) return; // Guard against no user

        setIsLoading(true);

        // Fetch restaurants
        const { data: restaurantData } = await supabase
            .from('restaurants')
            .select('*');

        if (restaurantData) {
            setRestaurants(restaurantData as Restaurant[]);
        }

        // Fetch reservations with restaurant info
        const { data: reservationData } = await supabase
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false });

        if (reservationData) {
            // Attach restaurant info to each reservation and map dietary_requirements
            const enrichedReservations = reservationData.map((r: any) => ({
                ...r,
                restaurant: (restaurantData as Restaurant[])?.find(rest => rest.id === r.restaurant_id),
                dietary_request: (r.dietary_requirements as unknown as { vegan: boolean; vegetarian: boolean; gluten_free: boolean; allergies?: string; other?: string }) || {
                    vegan: false,
                    vegetarian: false,
                    gluten_free: false
                }
            }));
            setReservations(enrichedReservations as unknown as Reservation[]);
        }

        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [fetchData, user]);

    // Show auth form if not logged in
    if (authLoading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-green-600" />
            </div>
        );
    }

    if (!user) {
        return <AuthForm onSignIn={signIn} onSignUp={signUp} />;
    }

    const updateStatus = async (id: string, status: 'confirmed' | 'rejected', note?: string) => {
        setUpdatingId(id);

        const { error } = await supabase
            .from('reservations')
            .update({ status, owner_note: note || null })
            .eq('id', id);

        if (!error) {
            setReservations(prev =>
                prev.map(r => r.id === id ? { ...r, status, owner_note: note || null } : r)
            );
        }

        setUpdatingId(null);
    };

    const filteredReservations = reservations.filter(r => {
        if (selectedRestaurant !== 'all' && r.restaurant_id !== selectedRestaurant) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        return true;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1"><Clock size={12} /> {t('pending')}</span>;
            case 'confirmed':
                return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1"><Check size={12} /> {t('confirmed')}</span>;
            case 'rejected':
                return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full flex items-center gap-1"><X size={12} /> {t('rejected')}</span>;
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDietaryTags = (dietary: Reservation['dietary_request']) => {
        const tags = [];
        if (dietary.vegan) tags.push('Vegan');
        if (dietary.vegetarian) tags.push('Vegetarian');
        if (dietary.gluten_free) tags.push('Gluten-Free');
        return tags;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                                <ArrowLeft size={20} className="text-stone-600" />
                            </Link>
                            <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-stone-500">{user.email}</span>
                            <span className="text-stone-300">|</span>
                            <span className="text-sm text-stone-500">{t('totalReservations')}: {reservations.length}</span>
                            <button
                                onClick={signOut}
                                className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-600"
                                title={t('logout')}
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Filters */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200 mb-6">
                    <div className="flex flex-wrap gap-4">
                        {/* Restaurant Filter */}
                        <div className="relative">
                            <select
                                value={selectedRestaurant}
                                onChange={(e) => setSelectedRestaurant(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            >
                                <option value="all">{t('allRestaurants')}</option>
                                {restaurants.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            >
                                <option value="all">{t('allStatuses')}</option>
                                <option value="pending">{t('pending')}</option>
                                <option value="confirmed">{t('confirmed')}</option>
                                <option value="rejected">{t('rejected')}</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Reservations List */}
                {filteredReservations.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border border-stone-200">
                        <Utensils size={48} className="mx-auto mb-4 text-stone-300" />
                        <p className="text-stone-500">{t('noReservations')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredReservations.map(reservation => (
                            <div key={reservation.id} className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    {/* Main Info */}
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-3 mb-2">
                                            {getStatusBadge(reservation.status)}
                                            <span className="text-xs text-stone-400">{formatDate(reservation.created_at)}</span>
                                        </div>
                                        <h3 className="font-bold text-stone-900 mb-1">{reservation.restaurant?.name || 'Unknown'}</h3>
                                        <div className="space-y-1 text-sm text-stone-600">
                                            <div className="flex items-center gap-2">
                                                <User size={14} />
                                                <span>{reservation.user_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} />
                                                <a href={`mailto:${reservation.user_email}`} className="text-green-600 hover:underline">
                                                    {reservation.user_email}
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dietary Info */}
                                    <div className="flex-1 min-w-[200px]">
                                        <p className="text-xs text-stone-400 mb-2">{t('dietaryRequests')}</p>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {getDietaryTags(reservation.dietary_request).map(tag => (
                                                <span key={tag} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        {reservation.dietary_request.allergies && (
                                            <p className="text-sm text-stone-600">
                                                <span className="font-medium">{t('allergies')}:</span> {reservation.dietary_request.allergies}
                                            </p>
                                        )}
                                        {reservation.dietary_request.other && (
                                            <p className="text-sm text-stone-600">
                                                <span className="font-medium">{t('other')}:</span> {reservation.dietary_request.other}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {reservation.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateStatus(reservation.id, 'confirmed')}
                                                disabled={updatingId === reservation.id}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                {updatingId === reservation.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Check size={16} />
                                                )}
                                                {t('approve')}
                                            </button>
                                            <button
                                                onClick={() => updateStatus(reservation.id, 'rejected')}
                                                disabled={updatingId === reservation.id}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <X size={16} />
                                                {t('reject')}
                                            </button>
                                        </div>
                                    )}

                                    {reservation.status !== 'pending' && reservation.owner_note && (
                                        <div className="text-sm text-stone-500 italic">
                                            {t('note')}: {reservation.owner_note}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
