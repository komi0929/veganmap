import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function AuthButton() {
    const [user, setUser] = useState<User | null>(null);
    const locale = useLocale();

    // ... (useEffect remains same)

    // ... (handleLogin, handleLogout remain same)

    if (user) {
        return (
            <div className="flex items-center gap-3">
                <Link href={`/${locale}/profile`} className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm hover:bg-stone-50 transition">
                    {user.user_metadata.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="User" className="w-6 h-6 rounded-full" />
                    ) : (
                        <UserIcon size={16} className="text-stone-500" />
                    )}
                    <span className="text-xs font-bold text-stone-700 max-w-[80px] truncate">{user.user_metadata.full_name || user.email}</span>
                </Link>
                <button
                    onClick={handleLogout}
                    className="p-2 bg-white/90 rounded-full shadow-sm hover:bg-stone-100 text-stone-600"
                    title="Sign Out"
                >
                    <LogOut size={18} />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleLogin}
            className="flex items-center gap-2 bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-md shadow-md hover:bg-black transition text-sm font-bold"
        >
            <LogIn size={16} />
            Sign In
        </button>
    );
}
