"use client";

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { FaSearch, FaArrowLeft } from 'react-icons/fa';

import 'leaflet/dist/leaflet.css';
import './mapStyles.css'; // Your custom map styles
import './ImageEditPanel.css'; // Styles for the panel (if not globally imported)

import type { Map, GeoJSON, Layer, LeafletMouseEvent, LatLngBoundsLiteral, LatLngTuple, Path, LayerGroup, LeafletEventHandlerFn } from 'leaflet';
import type LType from 'leaflet';

import { updateImageMarkersOnMap, type ImageInfo } from './imageMarkerUtils';
import { ImageEditPanel } from './ImageEditPanel';

// Constants
const MAP_CENTER: LatLngTuple = [20, 0];
const INITIAL_ZOOM: number = 3.2;
const MIN_ZOOM: number = 3;
const MAX_ZOOM: number = 14;

const WORLD_BOUNDS: LatLngBoundsLiteral = [[-75, -170], [82, 190]];
const MAX_BOUNDS_VISCOSITY: number = 0.88;
const TILE_LAYER_URL: string = 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png';
const TILE_LAYER_ATTRIBUTION: string = '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const GEOJSON_URL: string = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

const INITIAL_GEOJSON_STYLE = { weight: 0, opacity: 0, fillOpacity: 0 };
const HIGHLIGHT_STYLE = { weight: 2.5, color: '#e60000', fillOpacity: 0.5, fillColor: '#ffcccb', lineCap: 'round' as import('leaflet').LineCapShape, lineJoin: 'round' as import('leaflet').LineJoinShape };

interface CountryFeatureProperties { name: string; }
interface CountryFeature extends GeoJSON.Feature<GeoJSON.Geometry, CountryFeatureProperties> { }
interface GalleryPageProps { imagesData: ImageInfo[]; } // This will be initial data

const countrySpecificAdjustments: Record<string, { center?: [number, number]; zoomFactor?: number; fixedLng?: number; fixedLat?: number }> = {
    'Russia': { fixedLng: 95, zoomFactor: 1.3 },
    'United States of America': { fixedLat: 39.8283, fixedLng: -98.5795, zoomFactor: 1.7 },
    'Canada': { fixedLat: 60.1304, fixedLng: -105.3468, zoomFactor: 1.6 },
    'Greenland': { fixedLat: 72.5, fixedLng: -40.0, zoomFactor: 1.5 },
};

const IMAGE_MARKER_DEBOUNCE_TIME = 250;
const MAP_PICK_CURSOR_CLASS = 'leaflet-crosshair'; // Ensure this class is defined in your CSS

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): void => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), waitFor);
    };
}


export default function GalleryPage({ imagesData: initialImagesData }: GalleryPageProps) {
    const mapRef = useRef<Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const geoJsonLayerRef = useRef<GeoJSON<CountryFeatureProperties> | null>(null);
    const zoomedCountryNameRef = useRef<string | null>(null);
    const LRef = useRef<typeof LType | null>(null);
    const imageMarkersLayerRef = useRef<LayerGroup | null>(null);

    const [imagesData, setImagesData] = useState<ImageInfo[]>(initialImagesData);
    const [editingImage, setEditingImage] = useState<ImageInfo | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
    const [pickingLocationForImageId, setPickingLocationForImageId] = useState<string | null>(null);
    const [isMapReady, setIsMapReady] = useState<boolean>(false); // New state for map readiness
    // At the top of your GalleryPage component function
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<CountryFeature[]>([]); // CountryFeature is already defined
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
    const allCountryFeaturesRef = useRef<CountryFeature[]>([]); // To store all loaded country features
    const pickingLocationForImageIdRef = useRef(pickingLocationForImageId);
    const searchContainerRef = useRef<HTMLDivElement>(null); // Ref for the search container div

    useEffect(() => {
        pickingLocationForImageIdRef.current = pickingLocationForImageId;
    }, [pickingLocationForImageId]);

    const handleImageClick = useCallback((image: ImageInfo) => {
        if (pickingLocationForImageIdRef.current) return;
        setEditingImage(image);
        setIsPanelOpen(true);
    }, []);

    const handlePanelClose = useCallback(() => {
        setIsPanelOpen(false);
        setEditingImage(null);
    }, []);

    const handlePanelSave = useCallback((updatedImage: ImageInfo) => {
        setImagesData(prevImagesData =>
            prevImagesData.map(img => (img.id === updatedImage.id ? updatedImage : img))
        );
        setIsPanelOpen(false);
        setEditingImage(null);
    }, []);

    const handleStartPickLocation = useCallback(() => {
        if (editingImage) {
            setPickingLocationForImageId(editingImage.id);
            setIsPanelOpen(false);
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.add(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = 'crosshair';
            }
        }
    }, [editingImage]);

    const mapClickLogicHandler = useCallback((e: LeafletMouseEvent) => {
        if (pickingLocationForImageIdRef.current && LRef.current) {
            const L = LRef.current;
            const { lat, lng } = e.latlng;
            const targetImageId = pickingLocationForImageIdRef.current;

            setImagesData(prevImagesData =>
                prevImagesData.map(img =>
                    img.id === targetImageId
                        ? { ...img, lat, lng, }
                        : img
                )
            );
            setPickingLocationForImageId(null);

            if (mapContainerRef.current) {
                mapContainerRef.current.classList.remove(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = '';
            }
        }
    }, [setImagesData, setPickingLocationForImageId]);

    const mapClickLogicHandlerRef = useRef(mapClickLogicHandler);
    useEffect(() => {
        mapClickLogicHandlerRef.current = mapClickLogicHandler;
    }, [mapClickLogicHandler]);

    const updateImageMarkersCallback = useCallback(() => {
        const L = LRef.current;
        const map = mapRef.current;
        const imagesLayer = imageMarkersLayerRef.current;
        if (!L || !map || !imagesLayer) {
            // console.warn("Skipping marker update: Map or Leaflet not ready yet.");
            return;
        }
        updateImageMarkersOnMap({ L, map, imagesLayer, imagesData, onImageClick: handleImageClick });
    }, [imagesData, handleImageClick]);

    const debouncedUpdateImageMarkers = useMemo(() => {
        return debounce(updateImageMarkersCallback, IMAGE_MARKER_DEBOUNCE_TIME);
    }, [updateImageMarkersCallback]);

    // Effect for initializing the map (runs once on mount)
    useEffect(() => {
        let L_instance: typeof LType | null = null;
        let mapInstance: Map | null = null;

        const highlightFeature = (e: LeafletMouseEvent, feature: CountryFeature) => {
            if (pickingLocationForImageIdRef.current) return;
            if (!mapRef.current || !feature.properties) return;
            if (zoomedCountryNameRef.current !== feature.properties.name && (mapRef.current?.getZoom() ?? 0) < 10) {
                const layer = e.target as Path;
                layer.setStyle(HIGHLIGHT_STYLE);
                if (layer.bringToFront) layer.bringToFront();
            }
        };

        const resetHighlight = (e: LeafletMouseEvent) => {
            (e.target as Path).setStyle(INITIAL_GEOJSON_STYLE);
        };

        const zoomToFeature = (e: LeafletMouseEvent, feature: CountryFeature) => {
            if (pickingLocationForImageIdRef.current) return;
            resetHighlight(e);
            const layer = e.target as Path;
            const map = mapRef.current;
            if (!map || !layer || typeof (layer as any).getBounds !== 'function' || !feature.properties || !L_instance) return;
            // ... (rest of zoomToFeature logic is the same)
            const bounds = (layer as any).getBounds() as import('leaflet').LatLngBounds;
            let targetCenter = bounds.getCenter();
            let targetZoom = map.getBoundsZoom(bounds);
            const countryName = feature.properties.name;
            zoomedCountryNameRef.current = countryName;
            const adjustment = countrySpecificAdjustments[countryName];
            if (adjustment) {
                if (adjustment.fixedLat !== undefined && adjustment.fixedLng !== undefined) targetCenter = L_instance.latLng(adjustment.fixedLat, adjustment.fixedLng);
                else if (adjustment.fixedLng !== undefined) targetCenter = L_instance.latLng(targetCenter.lat, adjustment.fixedLng);
                else if (adjustment.fixedLat !== undefined) targetCenter = L_instance.latLng(adjustment.fixedLat, targetCenter.lng);
                if (adjustment.zoomFactor) targetZoom *= adjustment.zoomFactor;
            }
            const wrappedCenter = targetCenter.wrap();
            if (map.options.maxZoom !== undefined) targetZoom = Math.min(targetZoom, map.options.maxZoom);
            if (map.options.minZoom !== undefined) targetZoom = Math.max(targetZoom, map.options.minZoom);
            map.flyTo(wrappedCenter, targetZoom);
        };
        // Add a useEffect to handle clicks outside the search dropdown to close it

        const onEachFeature = (feature: CountryFeature, layer: Layer) => {
            layer.on({
                mouseover: (e: LeafletMouseEvent) => highlightFeature(e, feature),
                mouseout: resetHighlight,
                click: (e: LeafletMouseEvent) => {
                    if (pickingLocationForImageIdRef.current) {
                        return;
                    }
                    zoomToFeature(e, feature);
                },
            });
        };

        const loadGeoJsonData = async (mapInstance: Map, leaflet: typeof LType) => {
            try {
                const response = await fetch(GEOJSON_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                // Explicitly type the expected structure from your GeoJSON
                const geoJsonData = await response.json() as GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryFeatureProperties>;

                // Store all features for the search functionality
                // Ensure that features are correctly cast or mapped to CountryFeature if necessary
                allCountryFeaturesRef.current = geoJsonData.features.map(f => f as CountryFeature);

                if (geoJsonLayerRef.current && mapInstance.hasLayer(geoJsonLayerRef.current)) {
                    mapInstance.removeLayer(geoJsonLayerRef.current);
                }
                geoJsonLayerRef.current = leaflet.geoJSON(geoJsonData, {
                    style: () => INITIAL_GEOJSON_STYLE,
                    onEachFeature: onEachFeature, // onEachFeature is defined in your map init useEffect
                }).addTo(mapInstance);

            } catch (error) {
                console.error('Error loading or processing GeoJSON data:', error);
            }
        };

        const initializeMap = async () => {
            if (!mapContainerRef.current || mapRef.current) return;
            try {
                L_instance = await import('leaflet');
                LRef.current = L_instance;

                mapInstance = L_instance.map(mapContainerRef.current!, {
                    center: MAP_CENTER, zoom: INITIAL_ZOOM, maxBounds: L_instance.latLngBounds(WORLD_BOUNDS),
                    maxBoundsViscosity: MAX_BOUNDS_VISCOSITY, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM,
                    zoomControl: false, worldCopyJump: true,
                });
                mapRef.current = mapInstance;

                L_instance.tileLayer(TILE_LAYER_URL, { attribution: TILE_LAYER_ATTRIBUTION }).addTo(mapInstance);
                await loadGeoJsonData(mapInstance, L_instance);

                if (!imageMarkersLayerRef.current) {
                    imageMarkersLayerRef.current = L_instance.layerGroup().addTo(mapInstance);
                }

                const stableMapClickHandler = (e: LeafletMouseEvent) => mapClickLogicHandlerRef.current(e);
                mapInstance.on('click', stableMapClickHandler as LeafletEventHandlerFn);

                mapInstance.invalidateSize();
                setIsMapReady(true); // Signal that the map and essential refs are now ready

            } catch (error) {
                console.error("Error initializing Leaflet map:", error);
                setIsMapReady(false); // Optionally signal map is not ready on error
            }
        };

        initializeMap();
        const handleResize = () => mapRef.current?.invalidateSize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            setIsMapReady(false); // Reset map readiness on unmount
            if (mapInstance) {
                // ... (cleanup logic for mapInstance, layers, etc. is the same)
                if (geoJsonLayerRef.current && mapInstance.hasLayer(geoJsonLayerRef.current)) mapInstance.removeLayer(geoJsonLayerRef.current);
                if (imageMarkersLayerRef.current && mapInstance.hasLayer(imageMarkersLayerRef.current)) mapInstance.removeLayer(imageMarkersLayerRef.current);
                mapInstance.remove();
                mapRef.current = null;
            }
            geoJsonLayerRef.current = null;
            imageMarkersLayerRef.current = null;
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.remove(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = '';
            }
        };
    }, []); // Empty dependency array: runs once on mount

    // Effect for managing map's 'zoomend' and 'moveend' listeners
    useEffect(() => {
        const map = mapRef.current;
        // Ensure this only runs if the map is actually ready
        if (isMapReady && map) {
            const handler = debouncedUpdateImageMarkers;
            map.on('zoomend moveend', handler);
            return () => {
                map.off('zoomend moveend', handler);
            };
        }
    }, [isMapReady, debouncedUpdateImageMarkers]); // Add isMapReady here

    // Effect to update image markers when imagesData or map readiness changes
    useEffect(() => {
        // Condition now includes isMapReady
        if (isMapReady && mapRef.current && LRef.current && imageMarkersLayerRef.current) {
            updateImageMarkersCallback();
        }
    }, [isMapReady, imagesData, updateImageMarkersCallback]); // Added isMapReady to dependencies

    // Effect to synchronize props to state if initialImagesData changes from parent
    useEffect(() => {
        setImagesData(initialImagesData);
    }, [initialImagesData]);

    const handleDeleteImage = useCallback((imageIdToDelete: string) => {
        setImagesData(currentImagesData =>
            currentImagesData.filter(image => image.id !== imageIdToDelete)
        );
        // You might want to close the panel here too if it's not already handled,
        // though ImageEditPanel now closes itself after calling onDelete.
        // setIsPanelOpen(false);
        // setEditingImage(null);
    }, []); // Add dependencies if needed, e.g. [setImagesData]


    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value;
        setSearchQuery(query);

        if (query.trim() === "") {
            setSearchResults([]);
            setIsSearchDropdownOpen(false);
            return;
        }

        const filteredResults = allCountryFeaturesRef.current.filter(feature =>
            feature.properties.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filteredResults.slice(0, 10)); // Limit to, say, 10 results
        setIsSearchDropdownOpen(filteredResults.length > 0);
    };

    const flyToCountry = useCallback((feature: CountryFeature) => {
        const map = mapRef.current;
        const L = LRef.current;

        if (!map || !L || !feature?.properties?.name || !feature.geometry) {
            console.error("Cannot fly to country: Missing map, L, or valid feature data.");
            return;
        }

        let bounds: L.LatLngBounds | undefined;
        try {
            // Create a temporary layer from the feature to get its bounds
            const tempLayer = L.geoJSON(feature as GeoJSON.GeoJsonObject); // Cast to base GeoJsonObject
            bounds = tempLayer.getBounds();
        } catch (e) {
            console.error("Error creating layer or getting bounds for feature:", feature.properties.name, e);
            // Fallback if bounds cannot be determined (e.g., for some point geometries or malformed data)
            // You might attempt to extract a representative point from the geometry if possible
            if (feature.geometry && feature.geometry.type === 'Point') {
                const coords = feature.geometry.coordinates as [number, number]; // lng, lat
                map.flyTo([coords[1], coords[0]], 6); // Default zoom for a point
            }
            return;
        }

        if (!bounds || !bounds.isValid()) {
            console.warn("Invalid bounds for country:", feature.properties.name);
            // Similar fallback as above if bounds are not valid
            if (feature.geometry && feature.geometry.type === 'Point') {
                const coords = feature.geometry.coordinates as [number, number];
                map.flyTo([coords[1], coords[0]], 6);
            }
            return;
        }

        let targetCenter = bounds.getCenter();
        let targetZoom = map.getBoundsZoom(bounds);
        const countryName = feature.properties.name;

        zoomedCountryNameRef.current = countryName; // To prevent immediate re-highlight on mouseover
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

        map.flyTo(wrappedCenter, targetZoom, { duration: 1.5 }); // Added duration for smoother flight

        // Clear search and close dropdown
        setSearchQuery("");
        setSearchResults([]);
        setIsSearchDropdownOpen(false);

    }, [mapRef, LRef]); // `zoomedCountryNameRef` is a ref, no need in deps

    const handleSearchResultClick = (feature: CountryFeature) => {
        flyToCountry(feature);
        // Optionally, you could also set the searchQuery to the selected country name
        // setSearchQuery(feature.properties.name);
    };
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchContainerRef]);
    // Inside your GalleryPage component function:

    const handleBackButtonClick = () => {
        setSearchQuery("");
        setSearchResults([]);
        setIsSearchDropdownOpen(false);
        // You could add more functionality here later, like going to a previous map view if you implement such a history.
    };
    return (
        <>{/* Search Feature UI */}
            <div ref={searchContainerRef} className="country-search-container google-maps-style">
                {/* Back button - can be styled to be less prominent or part of a different flow */}
                <button
                    type="button"
                    className="search-back-button-gm" // New class for distinct styling
                    onClick={handleBackButtonClick}
                    aria-label="Clear search or go back"
                >
                    <FaArrowLeft />
                </button>

                <div className="search-input-wrapper-gm"> {/* Wraps input and search icon */}
                    <input
                        type="text"
                        className="search-input-field-gm"
                        placeholder="Search for a country..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => searchQuery && searchResults.length > 0 && setIsSearchDropdownOpen(true)}
                    />
                    <button
                        type="button"
                        className="search-action-button-gm search-submit-icon-gm"
                        aria-label="Search"
                    // onClick={handleSearchSubmit} // If you want the icon to trigger search
                    >
                        <FaSearch />
                    </button>
                </div>
                {isSearchDropdownOpen && searchResults.length > 0 && (
                    <ul className="search-results-dropdown-gm">
                        {searchResults.map(feature => (
                            <li
                                key={feature.properties.name}
                                onClick={() => handleSearchResultClick(feature)}
                                className="search-result-item-gm"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchResultClick(feature); }}
                            >
                                {feature.properties.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div ref={mapContainerRef} className="map-container" aria-label="Interactive world map"></div>
            {isPanelOpen && editingImage && (
                <ImageEditPanel
                    imageInfo={editingImage}
                    onSave={handlePanelSave}
                    onClose={handlePanelClose}
                    isOpen={isPanelOpen}
                    onStartPickLocation={handleStartPickLocation}
                    onDelete={handleDeleteImage}
                />
            )}
        </>
    );
}
