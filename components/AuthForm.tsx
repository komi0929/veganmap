'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, Lock, Loader2, LogIn, UserPlus } from 'lucide-react';

interface AuthFormProps {
    onSignIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    onSignUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}

export default function AuthForm({ onSignIn, onSignUp }: AuthFormProps) {
    const t = useTranslations('Auth');
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        const result = mode === 'signin'
            ? await onSignIn(email, password)
            : await onSignUp(email, password);

        setIsLoading(false);

        if (result.error) {
            setError(result.error.message);
        } else if (mode === 'signup') {
            setSuccess(t('signupSuccess'));
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-stone-900">{t('title')}</h1>
                    <p className="text-stone-500 mt-2">{t('subtitle')}</p>
                </div>

                {/* Mode Tabs */}
                <div className="flex mb-6 bg-stone-100 rounded-xl p-1">
                    <button
                        onClick={() => setMode('signin')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'signin'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                            }`}
                    >
                        {t('signIn')}
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'signup'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                            }`}
                    >
                        {t('signUp')}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('email')}
                            required
                            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('password')}
                            required
                            minLength={6}
                            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                            {success}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : mode === 'signin' ? (
                            <LogIn size={18} />
                        ) : (
                            <UserPlus size={18} />
                        )}
                        {mode === 'signin' ? t('signInButton') : t('signUpButton')}
                    </button>
                </form>
            </div>
        </div>
    );
}
