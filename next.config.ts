import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https' as const,
                hostname: 'maps.googleapis.com',
            },
            {
                protocol: 'https' as const,
                hostname: 'lh3.googleusercontent.com',
            },
        ],
    },
};

export default withNextIntl(nextConfig);
