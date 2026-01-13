'use client';

import React from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '100%'
};

interface MapComponentProps {
    center: {
        lat: number;
        lng: number;
    };
    zoom?: number;
}

const MapComponent = ({ center, zoom = 15 }: MapComponentProps): any => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = React.useState<google.maps.Map | null>(null);

    const onLoad = React.useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = React.useCallback(function callback() {
        setMap(null);
    }, []);

    return isLoaded ? (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={zoom}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                styles: [
                    {
                        "elementType": "geometry",
                        "stylers": [{ "color": "#242f3e" }]
                    },
                    {
                        "elementType": "labels.text.stroke",
                        "stylers": [{ "color": "#242f3e" }]
                    },
                    {
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#746855" }]
                    },
                    {
                        "featureType": "administrative.locality",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#d59563" }]
                    },
                    {
                        "featureType": "poi",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#d59563" }]
                    },
                    {
                        "featureType": "poi.park",
                        "elementType": "geometry",
                        "stylers": [{ "color": "#263c3f" }]
                    },
                    {
                        "featureType": "poi.park",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#6b9a76" }]
                    },
                    {
                        "featureType": "road",
                        "elementType": "geometry",
                        "stylers": [{ "color": "#38414e" }]
                    },
                    {
                        "featureType": "road",
                        "elementType": "geometry.stroke",
                        "stylers": [{ "color": "#212a37" }]
                    },
                    {
                        "featureType": "road",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#9ca5b3" }]
                    },
                    {
                        "featureType": "road.highway",
                        "elementType": "geometry",
                        "stylers": [{ "color": "#746855" }]
                    },
                    {
                        "featureType": "road.highway",
                        "elementType": "geometry.stroke",
                        "stylers": [{ "color": "#1f2835" }]
                    },
                    {
                        "featureType": "road.highway",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#f3d19c" }]
                    },
                    {
                        "featureType": "transit",
                        "elementType": "geometry",
                        "stylers": [{ "color": "#2f3948" }]
                    },
                    {
                        "featureType": "transit.station",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#d59563" }]
                    },
                    {
                        "featureType": "water",
                        "elementType": "geometry",
                        "stylers": [{ "color": "#17263c" }]
                    },
                    {
                        "featureType": "water",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#515c6d" }]
                    },
                    {
                        "featureType": "water",
                        "elementType": "labels.text.stroke",
                        "stylers": [{ "color": "#17263c" }]
                    }
                ]
            }}
        >
            <Marker
                position={center}
                icon={{
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#06b6d4">
                            <path d="M12 2L9 9h6L12 2zM12 22l3-7H9l3 7zM2 12l7-3v6l-7-3zM22 12l-7 3V9l7 3z"/>
                            <circle cx="12" cy="12" r="3" fill="#0891b2"/>
                        </svg>
                    `),
                    scaledSize: { width: 40, height: 40 } as any,
                    anchor: { x: 20, y: 20 } as any
                }}
            />
        </GoogleMap>
    ) : <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">Loading Map...</div>;
};

export default MapComponent;
