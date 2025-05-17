"use client";

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import './mapStyles.css';

import type { Map, GeoJSON, Layer, LeafletMouseEvent, LatLngBoundsLiteral, LatLngTuple, Path } from 'leaflet';

// Constants for Map Configuration
const MAP_CENTER: LatLngTuple = [20, 0];
const INITIAL_ZOOM: number = 3.2;
const MIN_ZOOM: number = 3;
const MAX_ZOOM: number = 14;
const WORLD_BOUNDS: LatLngBoundsLiteral = [[-75, -170], [82, 190]];
const MAX_BOUNDS_VISCOSITY: number = 0.88;
const TILE_LAYER_URL: string = 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png';
const TILE_LAYER_ATTRIBUTION: string = '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const GEOJSON_URL: string = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

// layer styles
const INITIAL_GEOJSON_STYLE = {
    weight: 0,
    opacity: 0,
    fillOpacity: 0,
};

const HIGHLIGHT_STYLE = {
    weight: 2.5,
    color: '#e60000',
    fillOpacity: 0.5,
    fillColor: '#ffcccb',
    lineCap: 'round' as L.LineCapShape,
    lineJoin: 'round' as L.LineJoinShape,
};

// TypeScript Interfaces
interface CountryFeatureProperties {
    name: string;
}

interface CountryFeature extends GeoJSON.Feature<GeoJSON.Geometry, CountryFeatureProperties> { }

// Adjustments for misaligned countires
const countrySpecificAdjustments: Record<string, { center?: [number, number]; zoomFactor?: number; fixedLng?: number; fixedLat?: number }> = {
    'Russia': { fixedLng: 95, zoomFactor: 1.3 },
    'United States of America': { fixedLat: 39.8283, fixedLng: -98.5795, zoomFactor: 1.7 },
    'Canada': { fixedLat: 60.1304, fixedLng: -105.3468, zoomFactor: 1.6 },
    'Greenland': { fixedLat: 72.5, fixedLng: -40.0, zoomFactor: 1.5 },
};

export default function GalleryPage() {
    const mapRef = useRef<Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const geoJsonLayerRef = useRef<GeoJSON<CountryFeatureProperties> | null>(null);
    const zoomedCountryNameRef = useRef<string | null>(null);

    useEffect(() => {
        let L: typeof import('leaflet');

        if (typeof window === 'undefined') {
            return;
        }

        const initializeMap = async () => {
            if (!mapContainerRef.current || mapRef.current) {
                return;
            }

            try {
                L = await import('leaflet');
                // @ts-ignore Icon fix
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                });

                const currentMapInstance = L.map(mapContainerRef.current, {
                    center: MAP_CENTER,
                    zoom: INITIAL_ZOOM,
                    maxBounds: L.latLngBounds(WORLD_BOUNDS),
                    maxBoundsViscosity: MAX_BOUNDS_VISCOSITY,
                    minZoom: MIN_ZOOM,
                    maxZoom: MAX_ZOOM,
                    zoomControl: false,
                    worldCopyJump: true,
                });
                mapRef.current = currentMapInstance;

                currentMapInstance.createPane('labels');

                L.tileLayer(TILE_LAYER_URL, {
                    attribution: TILE_LAYER_ATTRIBUTION,
                }).addTo(currentMapInstance);

                loadGeoJsonData(currentMapInstance, L);
                currentMapInstance.invalidateSize();

            } catch (error) {
                console.error("Error initializing Leaflet map:", error);
            }
        };

        // highlight on hover
        const highlightFeature = (e: LeafletMouseEvent, feature: CountryFeature) => {
            if (!mapRef.current || !feature.properties) return;
            if (zoomedCountryNameRef.current !== feature.properties.name) {
                const layer = e.target as Path;
                layer.setStyle(HIGHLIGHT_STYLE);
                if (layer.bringToFront) {
                    layer.bringToFront();
                }
            }
        };

        const resetHighlight = (e: LeafletMouseEvent) => {
            (e.target as Path).setStyle(INITIAL_GEOJSON_STYLE);
        }

        // on click zoom on specific county
        const zoomToFeature = (e: LeafletMouseEvent, feature: CountryFeature) => {
            resetHighlight(e);
            const layer = e.target as Path;
            const map = mapRef.current;

            if (!map || !layer || typeof (layer as any).getBounds !== 'function' || !feature.properties) {
                return;
            }

            const bounds = (layer as any).getBounds() as L.LatLngBounds;
            let targetCenter = bounds.getCenter();
            let targetZoom = map.getBoundsZoom(bounds);

            const countryName = feature.properties.name;
            zoomedCountryNameRef.current = countryName;
            const adjustment = countrySpecificAdjustments[countryName];
            if (adjustment) {
                if (adjustment.fixedLat !== undefined && adjustment.fixedLng !== undefined) {
                    targetCenter = L.latLng(adjustment.fixedLat, adjustment.fixedLng);
                } else if (adjustment.fixedLng !== undefined) {
                    targetCenter = L.latLng(targetCenter.lat, adjustment.fixedLng);
                } else if (adjustment.fixedLat !== undefined) {
                    targetCenter = L.latLng(adjustment.fixedLat, targetCenter.lng);
                }
                if (adjustment.zoomFactor) {
                    targetZoom *= adjustment.zoomFactor;
                }
            }

            const wrappedCenter = targetCenter.wrap();
            if (map.options.maxZoom !== undefined) {
                targetZoom = Math.min(targetZoom, map.options.maxZoom);
            }
            if (map.options.minZoom !== undefined) {
                targetZoom = Math.max(targetZoom, map.options.minZoom);
            }

            map.flyTo(wrappedCenter, targetZoom);
        };

        const onEachFeature = (feature: CountryFeature, layer: Layer) => {
            layer.on({
                mouseover: (e: LeafletMouseEvent) => highlightFeature(e, feature),
                mouseout: resetHighlight,
                click: (e: LeafletMouseEvent) => zoomToFeature(e, feature),
            });
        };

        const loadGeoJsonData = async (mapInstance: Map, leaflet: typeof import('leaflet')) => {
            try {
                const response = await fetch(GEOJSON_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json() as GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryFeatureProperties>;

                geoJsonLayerRef.current = leaflet.geoJSON(data, {
                    style: () => INITIAL_GEOJSON_STYLE,
                    onEachFeature: onEachFeature,
                }).addTo(mapInstance);

            } catch (error) {
                console.error('Error loading or processing GeoJSON data:', error);
            }
        };

        initializeMap();

        const handleResize = () => mapRef.current?.invalidateSize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (mapRef.current) {
                if (geoJsonLayerRef.current && mapRef.current.hasLayer(geoJsonLayerRef.current)) {
                    mapRef.current.removeLayer(geoJsonLayerRef.current);
                }
                geoJsonLayerRef.current = null;
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    return <div ref={mapContainerRef} className="map-container" aria-label="Interactive world map"></div>;
}