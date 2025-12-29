'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadProps {
    restaurantId: string;
    existingPhotos: string[];
    onUploadComplete: (photos: string[]) => void;
}

export default function PhotoUpload({ restaurantId, existingPhotos, onUploadComplete }: PhotoUploadProps) {
    const t = useTranslations('PhotoUpload');
    const [photos, setPhotos] = useState<string[]>(existingPhotos);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setError(null);

        const uploadedUrls: string[] = [];

        for (const file of Array.from(files)) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError(t('invalidType'));
                continue;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError(t('fileTooLarge'));
                continue;
            }

            const fileName = `${restaurantId}/${Date.now()}-${file.name}`;

            const { data, error: uploadError } = await supabase.storage
                .from('restaurant-photos')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                setError(t('uploadError'));
            } else if (data) {
                const { data: urlData } = supabase.storage
                    .from('restaurant-photos')
                    .getPublicUrl(data.path);

                uploadedUrls.push(urlData.publicUrl);
            }
        }

        if (uploadedUrls.length > 0) {
            const newPhotos = [...photos, ...uploadedUrls];
            setPhotos(newPhotos);

            // Update restaurant record
            await supabase
                .from('restaurants')
                .update({ photos: newPhotos })
                .eq('id', restaurantId);

            onUploadComplete(newPhotos);
        }

        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemovePhoto = async (photoUrl: string) => {
        const newPhotos = photos.filter(p => p !== photoUrl);
        setPhotos(newPhotos);

        await supabase
            .from('restaurants')
            .update({ photos: newPhotos })
            .eq('id', restaurantId);

        onUploadComplete(newPhotos);
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-stone-700">
                {t('title')}
            </label>

            {/* Photo Grid */}
            <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100">
                        <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                        <button
                            onClick={() => handleRemovePhoto(photo)}
                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        >
                            <X size={14} className="text-white" />
                        </button>
                    </div>
                ))}

                {/* Upload Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-stone-300 hover:border-green-400 bg-stone-50 hover:bg-green-50 transition-colors flex flex-col items-center justify-center gap-1"
                >
                    {isUploading ? (
                        <Loader2 size={24} className="text-green-600 animate-spin" />
                    ) : (
                        <>
                            <Upload size={24} className="text-stone-400" />
                            <span className="text-xs text-stone-500">{t('add')}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Error */}
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}

            {/* Help Text */}
            <p className="text-xs text-stone-500">
                {t('hint')}
            </p>
        </div>
    );
}
