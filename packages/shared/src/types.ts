export type DeliveryStatus =
    | 'pending'      // Waiting for operator to claim
    | 'assigned'     // Operator claimed, preparing drone
    | 'in_transit'   // Drone is flying to destination
    | 'delivered'    // Package delivered successfully
    | 'cancelled';   // Delivery was cancelled

export type DroneStatus =
    | 'idle'         // Available for delivery
    | 'flying'       // Currently on a mission
    | 'returning'    // Returning to base
    | 'charging'     // Battery charging
    | 'offline';     // Not connected

// ----- Location -----

export interface Location {
    lat: number;
    lng: number;
    address?: string;
}

// ----- User -----

export interface User {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    role: 'customer' | 'operator' | 'admin';
    created_at: string;
}

// ----- Drone -----

export interface Drone {
    id: string;
    name: string;
    status: DroneStatus;
    battery_level: number;
    current_lat: number | null;
    current_lng: number | null;
    created_at: string;
}

// ----- Delivery -----

export interface Delivery {
    id: string;
    user_id: string;
    operator_id: string | null;
    drone_id: string | null;
    status: DeliveryStatus;
    pin: string;  // 6-digit unlock code
    pickup_lat: number;
    pickup_lng: number;
    pickup_address?: string;
    dropoff_lat: number;
    dropoff_lng: number;
    dropoff_address?: string;
    package_description?: string;
    created_at: string;
    updated_at: string;
}

// ----- Telemetry (real-time drone data) -----

export interface Telemetry {
    id: string;
    drone_id: string;
    latitude: number;
    longitude: number;
    altitude: number;
    battery_level: number;
    speed: number;
    timestamp: string;
}

// ----- API Request/Response Types -----

export interface CreateDeliveryRequest {
    pickup_location: Location;
    dropoff_location: Location;
    package_description?: string;
}

export interface DroneCommandRequest {
    command: 'takeoff' | 'land' | 'move' | 'return_home' | 'hover';
    payload?: {
        direction?: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';
        speed?: number;
        target_location?: Location;
    };
}

// ----- MQTT Topics -----

export const MQTT_TOPICS = {
    telemetry: (droneId: string) => `drone/${droneId}/telemetry`,
    command: (droneId: string) => `drone/${droneId}/command`,
    video: (droneId: string) => `drone/${droneId}/video`,
    status: (droneId: string) => `drone/${droneId}/status`,
} as const;
