'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { Restaurant } from '@/lib/types';
import { X, Loader2, Save, Trash2 } from 'lucide-react';

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

interface EditRestaurantFormProps {
    restaurant: Restaurant;
    onSave: () => void;
    onClose: () => void;
}

export default function EditRestaurantForm({ restaurant, onSave, onClose }: EditRestaurantFormProps) {
    const t = useTranslations('EditRestaurant');
    const [name, setName] = useState(restaurant.name);
    const [address, setAddress] = useState(restaurant.address || '');
    const [selectedTags, setSelectedTags] = useState<string[]>(restaurant.tags || []);
    const [isVerified, setIsVerified] = useState(restaurant.is_verified);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const { error: updateError } = await (supabase as any)
            .from('restaurants')
            .update({
                name,
                address,
                tags: selectedTags,
                is_verified: isVerified
            })
            .eq('id', restaurant.id);

        setIsSubmitting(false);

        if (updateError) {
            console.error('Update error:', updateError);
            setError(t('error'));
        } else {
            onSave();
        }
    };

    const handleDelete = async () => {
        if (!confirm(t('confirmDelete'))) return;

        setIsDeleting(true);

        const { error: deleteError } = await (supabase as any)
            .from('restaurants')
            .delete()
            .eq('id', restaurant.id);

        setIsDeleting(false);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            setError(t('deleteError'));
        } else {
            onSave();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                            {t('name')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                            {t('address')}
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            {t('tags')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {TAG_OPTIONS.map(tag => (
                                <button
                                    type="button"
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

                    {/* Verified */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="verified"
                            checked={isVerified}
                            onChange={(e) => setIsVerified(e.target.checked)}
                            className="w-5 h-5 rounded border-stone-300 text-green-600 focus:ring-green-500"
                        />
                        <label htmlFor="verified" className="text-sm text-stone-700">
                            {t('verified')}
                        </label>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-4 py-3 bg-red-100 hover:bg-red-200 disabled:bg-red-50 text-red-700 rounded-xl transition-colors flex items-center gap-2"
                        >
                            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            {t('delete')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {t('save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
