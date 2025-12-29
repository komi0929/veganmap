'use client';

import { GoogleMap, useJsApiLoader, Marker, OverlayView } from '@react-google-maps/api';
import { useCallback, useState, useEffect, useRef } from 'react';
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
    const [zoom, setZoom] = useState(13);

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
                // If zooming in to a selected marker, ensure zoom is high enough to see details
                if (map.getZoom()! < 15) {
                    map.setZoom(16);
                }
            }
        }
    }, [map, selectedId, restaurants]);

    const handleZoomChanged = () => {
        if (map) {
            setZoom(map.getZoom() || 13);
        }
    };

    const getPixelPositionOffset = (width: number, height: number) => ({
        x: -(width / 2),
        y: -(height / 2),
    })

    return isLoaded ? (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onZoomChanged={handleZoomChanged}
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
            {restaurants.map(r => {
                if (!r.latitude || !r.longitude) return null;

                // Show photo marker if zoom is high enough AND photo exists
                const showPhoto = zoom >= 15 && r.photos && r.photos.length > 0;
                const photoUrl = showPhoto && r.photos ?
                    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=100&photo_reference=${r.photos[0]}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                    : null;

                const isSelected = selectedId === r.id;

                return showPhoto && photoUrl ? (
                    <OverlayView
                        key={r.id}
                        position={{ lat: r.latitude, lng: r.longitude }}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        getPixelPositionOffset={(x, y) => getPixelPositionOffset(60, 60)} // Center the 60x60 bubble
                    >
                        <div
                            onClick={() => onMarkerClick?.(r)}
                            className={`
                                relative w-16 h-16 rounded-full border-2 shadow-lg cursor-pointer transition-transform hover:scale-110
                                ${isSelected ? 'border-green-500 scale-110 z-50' : 'border-white z-10'}
                            `}
                        >
                            <img
                                src={photoUrl}
                                alt={r.name}
                                className="w-full h-full object-cover rounded-full bg-stone-200"
                            />
                            {isSelected && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-green-500 rotate-45 transform border-r border-b border-green-600"></div>
                            )}
                        </div>
                    </OverlayView>
                ) : (
                    <Marker
                        key={r.id}
                        position={{ lat: r.latitude, lng: r.longitude }}
                        title={r.name}
                        onClick={() => onMarkerClick?.(r)}
                        icon={isSelected ? {
                            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                        } : undefined}
                    />
                );
            })}
        </GoogleMap>
    ) : <></>
}

