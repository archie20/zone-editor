import type { GeoPoint } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

// A simple LatLng interface for Leaflet
export interface LatLng {
    lat: number;
    lng: number;
}

// Discriminated Union for Zone Geometry ---
export type ZoneGeometry =
    | { type: 'polygon'; coordinates: GeoPoint[]; } // For triangles and freeform shapes
    | { type: 'rectangle'; bounds: [GeoPoint, GeoPoint]; } // [southWest, northEast]
    | { type: 'circle'; center: GeoPoint; radius: number; } // Radius in meters

// The person assigned to a specific marked location
export interface AssignedPerson {
    name: string;
    phone: string;
    note: string;
}

// A specific marked point on the map within a zone
export interface MarkedLocation {
    id: string;
    name: string;
    location: GeoPoint;
    assignedPerson: AssignedPerson;
}

// A person assigned to an entire zone
export interface ZonePerson {
    id: string;
    name: string;
    phone: string;
    note: string;
}

// The core Zone object
export interface Zone {
    id: string;
    name: string;
    comment: string;
    color: string;
    ownerId: string;
    parentZoneId: string | null;
    geometry: ZoneGeometry;
}

// Firebase Auth User object, potentially extended
export type AppUser = FirebaseUser;