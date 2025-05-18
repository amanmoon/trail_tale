"use client";

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { FaSearch, FaArrowLeft, FaPlus } from 'react-icons/fa'; // Added FaPlus

import 'leaflet/dist/leaflet.css';
import './mapStyles.css';
import './ImageEditPanel.css';

import type { Map, GeoJSON, Layer, LeafletMouseEvent, LatLngBoundsLiteral, LatLngTuple, Path, LayerGroup, LeafletEventHandlerFn, FeatureGroup } from 'leaflet';
import type LType from 'leaflet';

import { updateImageMarkersOnMap, type ImageInfo } from './imageMarkerUtils'; // Ensure ImageInfo allows lat/lng to be initially 0 or handled
import { ImageEditPanel, type CurrentPanelFormData } from './ImageEditPanel'; // Ensure CurrentPanelFormData is exported from ImageEditPanel if not already

// ... (Constants remain the same) ...
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
interface GalleryPageProps { imagesData: ImageInfo[]; }

const countrySpecificAdjustments: Record<string, { center?: [number, number]; zoomFactor?: number; fixedLng?: number; fixedLat?: number }> = {
    'Russia': { fixedLng: 95, zoomFactor: 1.3 },
    'United States of America': { fixedLat: 39.8283, fixedLng: -98.5795, zoomFactor: 1.7 },
    'Canada': { fixedLat: 60.1304, fixedLng: -105.3468, zoomFactor: 1.6 },
    'Greenland': { fixedLat: 72.5, fixedLng: -40.0, zoomFactor: 1.5 },
};

const IMAGE_MARKER_DEBOUNCE_TIME = 250;
const MAP_PICK_CURSOR_CLASS = 'leaflet-crosshair';

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
    const [isMapReady, setIsMapReady] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<CountryFeature[]>([]);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
    const allCountryFeaturesRef = useRef<CountryFeature[]>([]);
    const pickingLocationForImageIdRef = useRef(pickingLocationForImageId);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // --- States for New Image Workflow ---
    const [isNewImagePanelOpen, setIsNewImagePanelOpen] = useState<boolean>(false);
    const [newImageDraft, setNewImageDraft] = useState<ImageInfo | null>(null);
    // --- End New Image Workflow States ---

    useEffect(() => {
        pickingLocationForImageIdRef.current = pickingLocationForImageId;
    }, [pickingLocationForImageId]);

    const handleImageClick = useCallback((image: ImageInfo) => {
        if (pickingLocationForImageIdRef.current) return; // Don't open panel if already picking location
        setNewImageDraft(null); // Ensure new image panel is closed
        setIsNewImagePanelOpen(false);
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


    // --- Handlers for New Image Workflow ---
    const openNewImagePanel = () => {
        setEditingImage(null); // Close regular edit panel
        setIsPanelOpen(false);

        setNewImageDraft({
            id: "NEW_IMAGE_TEMP_ID", // Temporary ID for panel logic
            url: "",
            caption: "",
            description: "",
            date: new Date().toISOString().split('T')[0], // Default to today
            lat: 0, // Initial value, panel can interpret this for "Pick Location"
            lng: 0, // Initial value
        });
        setIsNewImagePanelOpen(true);
    };

    const handleCloseNewImagePanel = () => {
        setIsNewImagePanelOpen(false);
        setNewImageDraft(null);
        if (pickingLocationForImageIdRef.current === "NEW_IMAGE_TEMP_ID") {
            setPickingLocationForImageId(null); // Clear picker if new image panel is closed
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.remove(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = '';
            }
        }
    };

    const handleSaveNewImage = (imageToSave: ImageInfo) => {
        if (imageToSave.lat === 0 && imageToSave.lng === 0 && imageToSave.id === "NEW_IMAGE_TEMP_ID") {
            // Or use !imageToSave.lat || !imageToSave.lng if they can be undefined
            alert("Please pick a location on the map for the new image.");
            return; // Keep panel open
        }
        const newImageWithPermanentId: ImageInfo = {
            ...imageToSave,
            id: Date.now().toString(), // Generate a real unique ID
        };
        setImagesData(prevImagesData => [...prevImagesData, newImageWithPermanentId]);
        handleCloseNewImagePanel();
    };

    const startPickLocationForNewImage = useCallback((currentFormData: CurrentPanelFormData) => {
        setIsNewImagePanelOpen(false);
        if (newImageDraft) {
            setNewImageDraft(prevDraft => ({
                ...(prevDraft as ImageInfo), // prevDraft is asserted to be ImageInfo
                ...currentFormData, // Update with current form data from panel
            }));
            setPickingLocationForImageId("NEW_IMAGE_TEMP_ID");
            // Panel remains open
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.add(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = 'crosshair';
            }
        }
    }, [newImageDraft]); // Added newImageDraft dependency


    const handleStartPickLocationForExistingImage = useCallback((currentFormDataFromPanel: CurrentPanelFormData) => {
        setIsPanelOpen(false);
        if (editingImage) {
            // Persist any intermediate edits from the panel before going to pick location
            const updatedImageWithFormValues = {
                ...editingImage,
                ...currentFormDataFromPanel
            };
            setEditingImage(updatedImageWithFormValues);
            // Optionally update in imagesData immediately if panel doesn't do it before calling this
            setImagesData(currentImages => currentImages.map(img => img.id === editingImage.id ? updatedImageWithFormValues : img));

            setPickingLocationForImageId(editingImage.id);
            // Panel remains open
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.add(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = 'crosshair';
            }
        }
    }, [editingImage, setEditingImage, setImagesData]);
    // --- End Handlers for New Image Workflow ---


    const mapClickLogicHandler = useCallback((e: LeafletMouseEvent) => {
        const currentPickerId = pickingLocationForImageIdRef.current;
        if (currentPickerId && LRef.current) {
            const { lat, lng } = e.latlng;

            if (currentPickerId === "NEW_IMAGE_TEMP_ID") {
                setNewImageDraft(prevDraft => {
                    if (!prevDraft) return null;
                    return { ...prevDraft, lat, lng };
                });
                setIsNewImagePanelOpen(true);

                // New image panel is already open and will re-render with new lat/lng.
            } else {
                let imageToReEdit: ImageInfo | null = null;
                setImagesData(prevImagesData =>
                    prevImagesData.map(img => {
                        if (img.id === currentPickerId) {
                            const updated = { ...img, lat, lng };
                            imageToReEdit = updated;
                            return updated;
                        }
                        return img;
                    })
                );
                if (imageToReEdit) {
                    setEditingImage(imageToReEdit); // Update editingImage to reflect new coords
                    // setIsPanelOpen(true); // Panel should have remained open
                }
            }

            setPickingLocationForImageId(null);
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.remove(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = '';
            }
        }
    }, [setImagesData, setNewImageDraft, setEditingImage]); // Dependencies updated


    const mapClickLogicHandlerRef = useRef(mapClickLogicHandler);
    useEffect(() => {
        mapClickLogicHandlerRef.current = mapClickLogicHandler;
    }, [mapClickLogicHandler]);

    const updateImageMarkersCallback = useCallback(() => {
        const L = LRef.current;
        const map = mapRef.current;
        const imagesLayer = imageMarkersLayerRef.current;
        if (!L || !map || !imagesLayer) return;
        updateImageMarkersOnMap({ L, map, imagesLayer, imagesData, onImageClick: handleImageClick });
    }, [imagesData, handleImageClick]);

    const debouncedUpdateImageMarkers = useMemo(() => {
        return debounce(updateImageMarkersCallback, IMAGE_MARKER_DEBOUNCE_TIME);
    }, [updateImageMarkersCallback]);

    useEffect(() => {
        // ... (map initialization logic - no changes here, but ensure it's complete)
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

        const onEachFeature = (feature: CountryFeature, layer: Layer) => {
            layer.on({
                mouseover: (e: LeafletMouseEvent) => highlightFeature(e, feature),
                mouseout: resetHighlight,
                click: (e: LeafletMouseEvent) => {
                    if (pickingLocationForImageIdRef.current) {
                        // If picking location, map click should be handled by mapClickLogicHandler
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
                const geoJsonData = await response.json() as GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryFeatureProperties>;
                allCountryFeaturesRef.current = geoJsonData.features.map(f => f as CountryFeature);

                if (geoJsonLayerRef.current && mapInstance.hasLayer(geoJsonLayerRef.current)) {
                    mapInstance.removeLayer(geoJsonLayerRef.current);
                }
                geoJsonLayerRef.current = leaflet.geoJSON(geoJsonData, {
                    style: () => INITIAL_GEOJSON_STYLE,
                    onEachFeature: onEachFeature,
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

                // Use the stable ref for the map click handler
                const stableMapClickHandler = (e: LeafletMouseEvent) => mapClickLogicHandlerRef.current(e);
                mapInstance.on('click', stableMapClickHandler as LeafletEventHandlerFn);

                mapInstance.invalidateSize();
                setIsMapReady(true);
            } catch (error) {
                console.error("Error initializing Leaflet map:", error);
                setIsMapReady(false);
            }
        };

        initializeMap();
        const handleResize = () => mapRef.current?.invalidateSize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            setIsMapReady(false);
            if (mapInstance) {
                mapInstance.off('click'); // Clean up click listener
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
    }, []);


    useEffect(() => {
        const map = mapRef.current;
        if (isMapReady && map) {
            const handler = debouncedUpdateImageMarkers;
            map.on('zoomend moveend', handler);
            return () => {
                map.off('zoomend moveend', handler);
            };
        }
    }, [isMapReady, debouncedUpdateImageMarkers]);

    useEffect(() => {
        if (isMapReady && mapRef.current && LRef.current && imageMarkersLayerRef.current) {
            updateImageMarkersCallback();
        }
    }, [isMapReady, imagesData, updateImageMarkersCallback]);

    useEffect(() => {
        setImagesData(initialImagesData);
    }, [initialImagesData]);

    const handleDeleteImage = useCallback((imageIdToDelete: string) => {
        setImagesData(currentImagesData =>
            currentImagesData.filter(image => image.id !== imageIdToDelete)
        );
        // Panel closes itself after calling onDelete
    }, []);


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
        setSearchResults(filteredResults.slice(0, 10));
        setIsSearchDropdownOpen(filteredResults.length > 0);
    };

    const flyToCountry = useCallback((feature: CountryFeature) => {
        // ... (flyToCountry logic remains the same)
        const map = mapRef.current;
        const L = LRef.current;

        if (!map || !L || !feature?.properties?.name || !feature.geometry) {
            console.error("Cannot fly to country: Missing map, L, or valid feature data.");
            return;
        }

        let bounds: L.LatLngBounds | undefined;
        try {
            const tempLayer = L.geoJSON(feature as GeoJSON.GeoJsonObject);
            bounds = tempLayer.getBounds();
        } catch (e) {
            console.error("Error creating layer or getting bounds for feature:", feature.properties.name, e);
            if (feature.geometry && feature.geometry.type === 'Point') {
                const coords = feature.geometry.coordinates as [number, number];
                map.flyTo([coords[1], coords[0]], 6);
            }
            return;
        }

        if (!bounds || !bounds.isValid()) {
            console.warn("Invalid bounds for country:", feature.properties.name);
            if (feature.geometry && feature.geometry.type === 'Point') {
                const coords = feature.geometry.coordinates as [number, number];
                map.flyTo([coords[1], coords[0]], 6);
            }
            return;
        }

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

        map.flyTo(wrappedCenter, targetZoom, { duration: 1.5 });

        setSearchQuery("");
        setSearchResults([]);
        setIsSearchDropdownOpen(false);
    }, [mapRef, LRef]);

    const handleSearchResultClick = (feature: CountryFeature) => {
        flyToCountry(feature);
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

    const handleBackButtonClick = () => {
        setSearchQuery("");
        setSearchResults([]);
        setIsSearchDropdownOpen(false);
    };

    return (
        <>
            <div ref={searchContainerRef} className="country-search-container google-maps-style">
                <button
                    type="button"
                    className="search-back-button-gm"
                    onClick={handleBackButtonClick}
                    aria-label="Clear search or go back"
                >
                    <FaArrowLeft />
                </button>
                <div className="search-input-wrapper-gm">
                    <input
                        type="text"
                        className="search-input-field-gm"
                        placeholder="Search for a country..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => searchQuery && searchResults.length > 0 && setIsSearchDropdownOpen(true)}
                    />
                    <button type="button" className="search-action-button-gm search-submit-icon-gm" aria-label="Search" >
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

            {/* Container for map overlay buttons like "Add New Image" */}
            <div className="map-actions-overlay">
                <button
                    onClick={openNewImagePanel}
                    className="map-overlay-button add-new-image-button"
                    aria-label="Add new image"
                    title="Add new image"
                    disabled={pickingLocationForImageId !== null} // Disable if already picking location
                >
                    <FaPlus />
                </button>
            </div>

            <div ref={mapContainerRef} className="map-container" aria-label="Interactive world map"></div>

            {/* Panel for NEW images */}
            {isNewImagePanelOpen && newImageDraft && (
                <ImageEditPanel
                    imageInfo={newImageDraft}
                    onSave={handleSaveNewImage}
                    onClose={handleCloseNewImagePanel}
                    isOpen={isNewImagePanelOpen}
                    onStartPickLocation={startPickLocationForNewImage}
                    onDelete={() => { /* Delete shouldn't be available for a new, unsaved image */ }}
                />
            )}

            {/* Panel for EDITING existing images */}
            {isPanelOpen && editingImage && (
                <ImageEditPanel
                    imageInfo={editingImage}
                    onSave={handlePanelSave}
                    onClose={handlePanelClose}
                    isOpen={isPanelOpen}
                    onStartPickLocation={handleStartPickLocationForExistingImage}
                    onDelete={handleDeleteImage}
                />
            )}
        </>
    );
}