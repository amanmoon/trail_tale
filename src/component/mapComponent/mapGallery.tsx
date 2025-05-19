"use client";

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { FaSearch, FaArrowLeft, FaPlus } from 'react-icons/fa';
import { GalleryPageProps, CountryFeatureProperties, CountryFeature } from '@/interfaces/interface';
import 'leaflet/dist/leaflet.css';
import './mapStyles.css';
import '../imageEditPannel/ImageEditPanel.css';

import type { Map, GeoJSON, Layer, LeafletMouseEvent, LatLngBoundsLiteral, LatLngTuple, Path, LayerGroup, LeafletEventHandlerFn, FeatureGroup } from 'leaflet';
import type LType from 'leaflet';

import { updateImageMarkersOnMap } from '../imageEditPannel/imageMarkerUtils';
import { ImageEditPanel } from '../imageEditPannel/ImageEditPanel';
import { type CurrentPanelFormData, type ImageInfo, type ImageItem } from '@/interfaces/interface';
import Link from 'next/link';

const MAP_CENTER: LatLngTuple = [20, 0];
const INITIAL_ZOOM: number = 3.2;
const MIN_ZOOM: number = 3;
const MAX_ZOOM: number = 14;

const WORLD_BOUNDS: LatLngBoundsLiteral = [[-75, -170], [82, 190]];
const MAX_BOUNDS_VISCOSITY: number = 0.88;
const TILE_LAYER_URL: string = 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_LAYER_ATTRIBUTION: string = '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const GEOJSON_URL: string = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

const INITIAL_GEOJSON_STYLE = { weight: 0, opacity: 0, fillOpacity: 0 };
const HIGHLIGHT_STYLE = { weight: 2.5, color: '#e60000', fillOpacity: 0.5, fillColor: '#ffcccb', lineCap: 'round' as import('leaflet').LineCapShape, lineJoin: 'round' as import('leaflet').LineJoinShape };

const countrySpecificAdjustments: Record<string, { center?: [number, number]; zoomFactor?: number; fixedLng?: number; fixedLat?: number }> = {
    'Russia': { fixedLng: 95, zoomFactor: 1.3 },
    'United States of America': { fixedLat: 39.8283, fixedLng: -98.5795, zoomFactor: 1.7 },
    'Canada': { fixedLat: 60.1304, fixedLng: -105.3468, zoomFactor: 1.6 },
    'Greenland': { fixedLat: 72.5, fixedLng: -40.0, zoomFactor: 1.5 },
};

const IMAGE_MARKER_DEBOUNCE_TIME = 250;
const MAP_PICK_CURSOR_CLASS = 'leaflet-crosshair';

// Helper to generate unique IDs (you should have a robust one in your utils)
const generatePageUniqueId = (prefix: string = "id") => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): void => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), waitFor);
    };
}

export default function GalleryPage({ imagesData: initialAlbumsData }: GalleryPageProps) {
    const mapRef = useRef<Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const geoJsonLayerRef = useRef<GeoJSON<CountryFeatureProperties> | null>(null);
    const zoomedCountryNameRef = useRef<string | null>(null);
    const LRef = useRef<typeof LType | null>(null);
    const imageMarkersLayerRef = useRef<LayerGroup | null>(null);

    const [albumsData, setAlbumsData] = useState<ImageInfo[]>(initialAlbumsData);
    const [editingAlbum, setEditingAlbum] = useState<ImageInfo | null>(null);
    const [isEditPanelOpen, setIsEditPanelOpen] = useState<boolean>(false);

    const [pickingLocationForAlbumId, setPickingLocationForAlbumId] = useState<string | null>(null);
    const pickingLocationForAlbumIdRef = useRef(pickingLocationForAlbumId);

    const [isMapReady, setIsMapReady] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<CountryFeature[]>([]);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
    const allCountryFeaturesRef = useRef<CountryFeature[]>([]);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const [isNewAlbumPanelOpen, setIsNewAlbumPanelOpen] = useState<boolean>(false);
    const [newAlbumDraft, setNewAlbumDraft] = useState<ImageInfo | null>(null); // This is an ImageInfo (album) object

    useEffect(() => {
        pickingLocationForAlbumIdRef.current = pickingLocationForAlbumId;
    }, [pickingLocationForAlbumId]);

    // Called when an album marker on the map is clicked
    const handleAlbumMarkerClick = useCallback((album: ImageInfo) => {
        if (pickingLocationForAlbumIdRef.current) return;
        setNewAlbumDraft(null);
        setIsNewAlbumPanelOpen(false);

        setEditingAlbum(album);
        setIsEditPanelOpen(true);
    }, []);

    const handleEditPanelClose = useCallback(() => {
        setIsEditPanelOpen(false);
        setEditingAlbum(null);
    }, []);

    // Called when an existing album's details are saved from the panel
    const handleEditPanelSave = useCallback((updatedAlbum: ImageInfo) => {
        setAlbumsData(prevAlbums =>
            prevAlbums.map(album => (album.id === updatedAlbum.id ? updatedAlbum : album))
        );
        setIsEditPanelOpen(false);
        setEditingAlbum(null);
    }, []);

    // Handlers for New Album Workflow 
    const openNewAlbumPanel = () => {
        setEditingAlbum(null); // Close regular edit panel if open
        setIsEditPanelOpen(false);

        const defaultCover: ImageItem = {
            id: generatePageUniqueId("imgItem_cover_new"),
            url: "",
            dateAdded: new Date().toISOString(),
        };
        setNewAlbumDraft({
            id: "NEW_IMAGE_TEMP_ID",
            title: "",
            description: "",
            albumCover: defaultCover,
            images: [],
            lat: 0,
            lng: 0,
            country: "",
            dateCreated: new Date().toISOString().split('T')[0], // Default to today
            lastUpdated: new Date().toISOString(),
        });
        setIsNewAlbumPanelOpen(true);
    };

    const handleCloseNewAlbumPanel = () => {
        setIsNewAlbumPanelOpen(false);
        setNewAlbumDraft(null);
        if (pickingLocationForAlbumIdRef.current === "NEW_IMAGE_TEMP_ID") {
            setPickingLocationForAlbumId(null);
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.remove(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = '';
            }
        }
    };

    const handleSaveNewAlbum = (albumToSave: ImageInfo) => {
        if (!albumToSave.albumCover.url) {
            alert("Please provide an Album Cover Image Key or upload a cover image for the new album.");
            return; // Keep panel open
        }
        if (albumToSave.lat === 0 && albumToSave.lng === 0 && albumToSave.id === "NEW_IMAGE_TEMP_ID") {
            alert("Please pick a location on the map for the new album.");
            return; // Keep panel open
        }

        const newAlbumWithPermanentId: ImageInfo = {
            ...albumToSave,
            id: generatePageUniqueId("album"), // Generate a real unique ID for the album
            dateCreated: albumToSave.dateCreated || new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };
        setAlbumsData(prevAlbums => [...prevAlbums, newAlbumWithPermanentId]);
        handleCloseNewAlbumPanel();
    };

    const startPickLocationForNewAlbum = useCallback((currentFormData: CurrentPanelFormData) => {
        setIsNewAlbumPanelOpen(false); // Keep the new album panel technically "open" but hidden by map interaction
        if (newAlbumDraft) {
            setNewAlbumDraft(prevDraft => {
                if (!prevDraft) return null;
                // Update draft with current form values before hiding panel for map picking
                const updatedCover = (currentFormData.albumCoverUrl && currentFormData.albumCoverUrl !== prevDraft.albumCover.url)
                    ? { id: prevDraft.albumCover.id || generatePageUniqueId("imgItem_cover_pick"), url: currentFormData.albumCoverUrl, dateAdded: new Date().toISOString() }
                    : prevDraft.albumCover;

                return {
                    ...prevDraft,
                    title: currentFormData.title,
                    description: currentFormData.description,
                    albumCover: updatedCover,
                    dateCreated: currentFormData.albumDate || prevDraft.dateCreated, // Assuming albumDate is dateCreated
                };
            });
            setPickingLocationForAlbumId("NEW_IMAGE_TEMP_ID");
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.add(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = 'crosshair';
            }
        }
    }, [newAlbumDraft]);

    const startPickLocationForExistingAlbum = useCallback((currentFormDataFromPanel: CurrentPanelFormData) => {
        setIsEditPanelOpen(false);
        if (editingAlbum) {
            const updatedCover = (currentFormDataFromPanel.albumCoverUrl && currentFormDataFromPanel.albumCoverUrl !== editingAlbum.albumCover.url)
                ? { id: editingAlbum.albumCover.id || generatePageUniqueId("imgItem_cover_pick_edit"), url: currentFormDataFromPanel.albumCoverUrl, dateAdded: new Date().toISOString() }
                : editingAlbum.albumCover;

            const updatedAlbumWithFormValues: ImageInfo = {
                ...editingAlbum,
                title: currentFormDataFromPanel.title,
                description: currentFormDataFromPanel.description,
                albumCover: updatedCover,
            };
            setEditingAlbum(updatedAlbumWithFormValues);
            setPickingLocationForAlbumId(editingAlbum.id);
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.add(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = 'crosshair';
            }
        }
    }, [editingAlbum]);
    const mapClickLogicHandler = useCallback((e: LeafletMouseEvent) => {
        const currentPickerId = pickingLocationForAlbumIdRef.current;
        if (currentPickerId && LRef.current) {
            const { lat, lng } = e.latlng;

            if (currentPickerId === "NEW_IMAGE_TEMP_ID") {
                setNewAlbumDraft(prevDraft => {
                    if (!prevDraft) return null;
                    return { ...prevDraft, lat, lng, lastUpdated: new Date().toISOString() };
                });
                setIsNewAlbumPanelOpen(true);
            } else {
                let albumToReEdit: ImageInfo | null = null;
                setAlbumsData(prevAlbums =>
                    prevAlbums.map(album => {
                        if (album.id === currentPickerId) {
                            const updated = { ...album, lat, lng, lastUpdated: new Date().toISOString() };
                            albumToReEdit = updated;
                            return updated;
                        }
                        return album;
                    })
                );
                if (albumToReEdit) {
                    setEditingAlbum(albumToReEdit);
                    setIsEditPanelOpen(true);
                }
            }

            setPickingLocationForAlbumId(null);
            if (mapContainerRef.current) {
                mapContainerRef.current.classList.remove(MAP_PICK_CURSOR_CLASS);
                mapContainerRef.current.style.cursor = '';
            }
        }
    }, [setAlbumsData, setNewAlbumDraft, setEditingAlbum]);


    const mapClickLogicHandlerRef = useRef(mapClickLogicHandler);
    useEffect(() => {
        mapClickLogicHandlerRef.current = mapClickLogicHandler;
    }, [mapClickLogicHandler]);

    // Update markers when albumsData changes or when map becomes ready
    const updateAlbumMarkersCallback = useCallback(() => {
        const L = LRef.current;
        const map = mapRef.current;
        const layer = imageMarkersLayerRef.current;
        if (!L || !map || !layer) return;
        updateImageMarkersOnMap({ L, map, imagesLayer: layer, imagesData: albumsData, onImageClick: handleAlbumMarkerClick });
    }, [albumsData, handleAlbumMarkerClick]);

    const debouncedUpdateAlbumMarkers = useMemo(() => {
        return debounce(updateAlbumMarkersCallback, IMAGE_MARKER_DEBOUNCE_TIME);
    }, [updateAlbumMarkersCallback]);


    // Effect for initializing map
    useEffect(() => {
        let L_instance: typeof LType | null = null;
        let mapInstance: Map | null = null;

        const highlightFeature = (e: LeafletMouseEvent, feature: CountryFeature) => {
            if (pickingLocationForAlbumIdRef.current) return;
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
            if (pickingLocationForAlbumIdRef.current) return;
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
                    if (pickingLocationForAlbumIdRef.current) {
                        return;
                    }
                    zoomToFeature(e, feature);
                },
            });
        };
        const loadGeoJsonData = async (mapInst: Map, leaflet: typeof LType) => {
            try {
                const response = await fetch(GEOJSON_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const geoJsonData = await response.json() as GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryFeatureProperties>;
                allCountryFeaturesRef.current = geoJsonData.features.map(f => f as CountryFeature);

                if (geoJsonLayerRef.current && mapInst.hasLayer(geoJsonLayerRef.current)) {
                    mapInst.removeLayer(geoJsonLayerRef.current);
                }
                geoJsonLayerRef.current = leaflet.geoJSON(geoJsonData, {
                    style: () => INITIAL_GEOJSON_STYLE,
                    onEachFeature: onEachFeature,
                }).addTo(mapInst);
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
                setIsMapReady(true);
            } catch (error) {            }
        };

        initializeMap();

        const handleResize = () => mapRef.current?.invalidateSize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            setIsMapReady(false);
            if (mapInstance) {
                mapInstance.off('click');
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


    // Effect for updating markers on map events
    useEffect(() => {
        const map = mapRef.current;
        if (isMapReady && map) {
            const handler = debouncedUpdateAlbumMarkers;
            map.on('zoomend moveend', handler);
            return () => {
                map.off('zoomend moveend', handler);
            };
        }
    }, [isMapReady, debouncedUpdateAlbumMarkers]);

    // Effect for initial marker update and when albumsData changes
    useEffect(() => {
        if (isMapReady && mapRef.current && LRef.current && imageMarkersLayerRef.current) {
            updateAlbumMarkersCallback();
        }
    }, [isMapReady, albumsData, updateAlbumMarkersCallback]); // updateAlbumMarkersCallback depends on albumsData

    // Effect to update local albumsData state if initial prop changes
    useEffect(() => {
        setAlbumsData(initialAlbumsData);
    }, [initialAlbumsData]);

    // Handler for deleting an album (passed to ImageEditPanel)
    const handleDeleteAlbum = useCallback((albumIdToDelete: string) => {
        setAlbumsData(currentAlbums =>
            currentAlbums.filter(album => album.id !== albumIdToDelete)
        );
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


    return (
        <>
            <div ref={searchContainerRef} className="country-search-container google-maps-style">
                <Link href="/" className="search-back-button-gm" aria-label="Clear search or go back"><FaArrowLeft /></Link>
                <div className="search-input-wrapper-gm">
                    <input type="text" className="search-input-field-gm" placeholder="Search for a country..." value={searchQuery} onChange={handleSearchChange} onFocus={() => searchQuery && searchResults.length > 0 && setIsSearchDropdownOpen(true)} />
                    <button type="button" className="search-action-button-gm search-submit-icon-gm" aria-label="Search" > <FaSearch /> </button>
                </div>
                {isSearchDropdownOpen && searchResults.length > 0 && (
                    <ul className="search-results-dropdown-gm">
                        {searchResults.map(feature => (<li key={feature.properties.name} onClick={() => handleSearchResultClick(feature)} className="search-result-item-gm" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleSearchResultClick(feature); }} > {feature.properties.name} </li>))}
                    </ul>
                )}
            </div>

            <div className="map-actions-overlay">
                <button
                    onClick={openNewAlbumPanel}
                    className="map-overlay-button add-new-image-button"
                    aria-label="Add new album"
                    title="Add new album"
                    disabled={pickingLocationForAlbumId !== null}
                >
                    <FaPlus />
                </button>
            </div>

            <div ref={mapContainerRef} className="map-container" aria-label="Interactive world map"></div>

            {isNewAlbumPanelOpen && newAlbumDraft && (
                <ImageEditPanel
                    imageInfo={newAlbumDraft}
                    onSave={handleSaveNewAlbum}
                    onClose={handleCloseNewAlbumPanel}
                    isOpen={isNewAlbumPanelOpen}
                    onStartPickLocation={startPickLocationForNewAlbum}
                    onDelete={() => { }}
                />
            )}

            {isEditPanelOpen && editingAlbum && (
                <ImageEditPanel
                    imageInfo={editingAlbum} // editingAlbum is an ImageInfo (album)
                    onSave={handleEditPanelSave}
                    onClose={handleEditPanelClose}
                    isOpen={isEditPanelOpen}
                    onStartPickLocation={startPickLocationForExistingAlbum}
                    onDelete={handleDeleteAlbum} // Changed from handleDeleteImage
                />
            )}
        </>
    );
}