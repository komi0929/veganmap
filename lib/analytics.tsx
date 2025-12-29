'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Check if GA is available
declare global {
    interface Window {
        gtag: (...args: any[]) => void;
        dataLayer: any[];
    }
}

export function GoogleAnalytics() {
    if (!GA_MEASUREMENT_ID) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${GA_MEASUREMENT_ID}');
                `}
            </Script>
        </>
    );
}

// Custom event tracking functions
export function trackSearchExecuted(params: {
    location?: string;
    active_filters: string[];
}) {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'search_executed', {
            location: params.location || 'unknown',
            active_filters: params.active_filters.join(','),
            filter_count: params.active_filters.length
        });
    }
}

export function trackFilterToggled(params: {
    filter_name: string;
    is_active: boolean;
}) {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'filter_toggled', {
            filter_name: params.filter_name,
            action: params.is_active ? 'enabled' : 'disabled'
        });
    }
}

export function trackRestaurantViewed(params: {
    restaurant_id: string;
    restaurant_name: string;
    is_verified: boolean;
}) {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'restaurant_viewed', {
            restaurant_id: params.restaurant_id,
            restaurant_name: params.restaurant_name,
            is_verified: params.is_verified
        });
    }
}

// Critical KPI: Inquiry/Reservation submitted
export function trackInquirySubmitted(params: {
    restaurant_id: string;
    restaurant_name: string;
    dietary_preferences: string[];
}) {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'inquiry_submitted', {
            restaurant_id: params.restaurant_id,
            restaurant_name: params.restaurant_name,
            dietary_preferences: params.dietary_preferences.join(','),
            dietary_count: params.dietary_preferences.length
        });
    }
}

export function trackPageView(url: string) {
    if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
        window.gtag('config', GA_MEASUREMENT_ID, {
            page_path: url
        });
    }
}
