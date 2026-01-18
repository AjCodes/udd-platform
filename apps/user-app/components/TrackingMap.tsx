'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '100%'
};

interface LatLng {
    lat: number;
    lng: number;
}

interface TrackingMapProps {
    droneLocation: LatLng | null;
    pickupLocation: LatLng;
    dropoffLocation: LatLng;
}

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
        {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
        }
    ]
};

const TrackingMap: React.FC<TrackingMapProps> = ({ droneLocation, pickupLocation, dropoffLocation }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(_map: google.maps.Map) {
        setMap(null);
    }, []);

    // fitBounds moved to useEffect

    useEffect(() => {
        if (map) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(pickupLocation);
            bounds.extend(dropoffLocation);
            if (droneLocation) {
                bounds.extend(droneLocation);
            }
            map.fitBounds(bounds);

            // Adjust padding to ensure markers aren't on the very edge
            google.maps.event.addListenerOnce(map, "idle", () => {
                const zoom = map.getZoom();
                if (zoom && zoom > 16) map.setZoom(16);
            });
        }
    }, [map, droneLocation, pickupLocation, dropoffLocation]);

    if (!isLoaded) return <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            zoom={14}
            center={pickupLocation}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
        >
            {/* Pickup Marker */}
            <Marker
                position={pickupLocation}
                icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                }}
            />

            {/* Dropoff Marker */}
            <Marker
                position={dropoffLocation}
                icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                }}
            />

            {/* Drone Marker */}
            {droneLocation && (
                <Marker
                    position={droneLocation}
                    icon={{
                        // Use a custom drone icon or a distinctive standard one
                        url: '/drone_icon_high_res.png',
                        scaledSize: new window.google.maps.Size(40, 40),
                        anchor: new window.google.maps.Point(20, 20)
                    }}
                    zIndex={1000}
                />
            )}

            {/* Path Line */}
            <Polyline
                path={[pickupLocation, dropoffLocation]}
                options={{
                    strokeColor: "#008080", // Teal
                    strokeOpacity: 0.5,
                    strokeWeight: 4,
                    geodesic: true,
                    icons: [{
                        icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                        offset: '100%'
                    }]
                }}
            />

            {/* Active Path from Drone to Pickup/Dropoff depending on phase could be added here */}
        </GoogleMap>
    );
};

export default React.memo(TrackingMap);
