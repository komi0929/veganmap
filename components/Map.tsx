'use client';

import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useCallback, useState, useEffect } from 'react';
import { Restaurant } from '@/lib/types';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 33.5902, // Fukuoka default
    lng: 130.4017
};

interface MapProps {
    restaurants: Restaurant[];
    onMarkerClick?: (restaurant: Restaurant) => void;
    selectedId?: string;
}

export default function Map({ restaurants, onMarkerClick, selectedId }: MapProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    })

    const [map, setMap] = useState<google.maps.Map | null>(null)

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map)
    }, [])

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null)
    }, [])

    // Update map bounds when restaurants change
    useEffect(() => {
        if (map && restaurants.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            let hasValidCoords = false;

            restaurants.forEach(r => {
                if (r.latitude && r.longitude) {
                    bounds.extend({ lat: r.latitude, lng: r.longitude });
                    hasValidCoords = true;
                }
            });

            if (hasValidCoords) {
                map.fitBounds(bounds);
            }
        }
    }, [map, restaurants]);

    // Pan to selected marker
    useEffect(() => {
        if (map && selectedId) {
            const selected = restaurants.find(r => r.id === selectedId);
            if (selected?.latitude && selected?.longitude) {
                map.panTo({ lat: selected.latitude, lng: selected.longitude });
            }
        }
    }, [map, selectedId, restaurants]);

    return isLoaded ? (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
                styles: [
                    {
                        featureType: "poi",
                        stylers: [{ visibility: "off" }]
                    }
                ]
            }}
        >
            {restaurants.map(r => (
                r.latitude && r.longitude ? (
                    <Marker
                        key={r.id}
                        position={{ lat: r.latitude, lng: r.longitude }}
                        title={r.name}
                        onClick={() => onMarkerClick?.(r)}
                        icon={selectedId === r.id ? {
                            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                        } : undefined}
                    />
                ) : null
            ))}
        </GoogleMap>
    ) : <></>
}

