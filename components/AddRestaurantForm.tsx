'use client';

import { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';

interface PlaceDetails {
    place_id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
}

interface AddRestaurantFormProps {
    place: PlaceDetails;
    onSuccess: () => void;
    onCancel: () => void;
}

const TAG_OPTIONS = [
    'vegan',
    'vegetarian',
    'gluten-free',
    'organic',
    'japanese',
    'cafe',
    'takeout',
    'lunch',
    'dinner'
];

export default function AddRestaurantForm({ place, onSuccess, onCancel }: AddRestaurantFormProps) {
    const t = useTranslations('AddRestaurant');
    const [selectedTags, setSelectedTags] = useState<string[]>(['vegan']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Bypass type checking for insert operation
            const { error: insertError } = await (supabase as any)
                .from('restaurants')
                .insert([{
                    google_place_id: place.place_id,
                    name: place.name,
                    address: place.address,
                    latitude: place.latitude,
                    longitude: place.longitude,
                    tags: selectedTags,
                    is_verified: false
                }]);

            if (insertError) {
                if (insertError.code === '23505') {
                    // Unique constraint violation - restaurant already exists
                    setError(t('alreadyExists'));
                } else {
                    throw insertError;
                }
            } else {
                onSuccess();
            }
        } catch (err) {
            console.error('Add restaurant error:', err);
            setError(t('error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-stone-100">
                    <h2 className="text-lg font-bold text-stone-900">{t('title')}</h2>
                    <p className="text-sm text-stone-500 mt-1">{place.name}</p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                            {t('address')}
                        </label>
                        <p className="text-stone-600 text-sm bg-stone-50 p-3 rounded-lg">
                            {place.address}
                        </p>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            {t('tags')} <span className="text-stone-400 font-normal">({t('selectAtLeastOne')})</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {TAG_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${selectedTags.includes(tag)
                                        ? 'bg-green-100 border-green-300 text-green-700'
                                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                                        }`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-100 flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors font-medium"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || selectedTags.length === 0}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Check size={18} />
                        )}
                        {t('submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}
