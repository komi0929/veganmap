'use client';

import { useState } from 'react';
import { X, Send, Loader2, CheckCircle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { Restaurant, Reservation } from '@/lib/types';

interface ReservationFormProps {
    restaurant: Restaurant;
    onClose: () => void;
}

export default function ReservationForm({ restaurant, onClose }: ReservationFormProps) {
    const t = useTranslations('Reservation');
    const locale = useLocale();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        vegan: false,
        vegetarian: false,
        glutenFree: false,
        allergies: '',
        other: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const reservation: Reservation = {
            restaurant_id: restaurant.id,
            user_email: formData.email,
            user_name: formData.name,
            user_lang: locale,
            dietary_request: {
                vegan: formData.vegan,
                vegetarian: formData.vegetarian,
                gluten_free: formData.glutenFree,
                allergies: formData.allergies || undefined,
                other: formData.other || undefined
            }
        };

        const { error: submitError } = await supabase
            .from('reservations')
            .insert([reservation]);

        setIsSubmitting(false);

        if (submitError) {
            console.error('Reservation error:', submitError);
            setError(t('errorMessage'));
        } else {
            setIsSuccess(true);
        }
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-stone-900 mb-2">{t('successTitle')}</h2>
                    <p className="text-stone-600 mb-6">{t('successMessage')}</p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-colors font-medium"
                    >
                        {t('close')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">{t('title')}</h2>
                        <p className="text-sm text-stone-500">{restaurant.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-stone-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                            {t('name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            placeholder={t('namePlaceholder')}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                            {t('email')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            placeholder={t('emailPlaceholder')}
                        />
                    </div>

                    {/* Dietary Preferences */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            {t('dietaryPreferences')}
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.vegan}
                                    onChange={e => setFormData({ ...formData, vegan: e.target.checked })}
                                    className="w-5 h-5 rounded border-stone-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm text-stone-700">{t('vegan')}</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.vegetarian}
                                    onChange={e => setFormData({ ...formData, vegetarian: e.target.checked })}
                                    className="w-5 h-5 rounded border-stone-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm text-stone-700">{t('vegetarian')}</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.glutenFree}
                                    onChange={e => setFormData({ ...formData, glutenFree: e.target.checked })}
                                    className="w-5 h-5 rounded border-stone-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm text-stone-700">{t('glutenFree')}</span>
                            </label>
                        </div>
                    </div>

                    {/* Allergies */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                            {t('allergies')}
                        </label>
                        <input
                            type="text"
                            value={formData.allergies}
                            onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            placeholder={t('allergiesPlaceholder')}
                        />
                    </div>

                    {/* Other Requests */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                            {t('otherRequests')}
                        </label>
                        <textarea
                            value={formData.other}
                            onChange={e => setFormData({ ...formData, other: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
                            placeholder={t('otherPlaceholder')}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {t('submitting')}
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                {t('submit')}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
