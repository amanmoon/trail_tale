// src/imageMarkerUtils.ts
import type { Map as LeafletMap, LayerGroup as LeafletLayerGroup } from 'leaflet';
import type LType from 'leaflet';

// --- Base dimensions for the marker at its largest size ---
const BASE_PHOTO_WIDTH: number = 160; // Max photo width (target at max zoom for scaling)
const BASE_BORDER_UNIFORM: number = 12;  // Border thickness around photo at max size
const BASE_CAPTION_AREA_HEIGHT: number = 30; // Caption area height at max size
const BASE_PIN_VISUAL_OFFSET: number = 25;   // Pin's visual height at max size
const BASE_PIN_FONT_SIZE: number = 30;       // Pin emoji/icon font size at max size
const BASE_CAPTION_FONT_SIZE: number = 30;   // Caption font size at max size
const BASE_ROTATION_BUFFER: number = 12;     // Visual buffer for rotation at max size

// --- Target photo widths for scaling ---
const MIN_PHOTO_WIDTH_TARGET: number = 40; // Min photo width user requested
const MAX_PHOTO_WIDTH_TARGET: number = BASE_PHOTO_WIDTH; // Max photo width is our base

// --- Zoom levels for controlling scaling ---
const ZOOM_LEVEL_FOR_MIN_SIZE: number = 7;  // At this zoom or lower, marker is smallest
const ZOOM_LEVEL_FOR_MAX_SIZE: number = 13; // At this zoom or higher, marker is largest

const COUNTRY_REPRESENTATIVE_MAX_ZOOM = 5; // Remains for marker filtering logic

export interface ImageInfo {
    id: string;
    lat: number;
    lng: number;
    url: string;
    country?: string;
    caption?: string;
    description?: string;
    date?: string;
}

interface UpdateImageMarkersParams {
    L: typeof LType;
    map: LeafletMap;
    imagesLayer: LeafletLayerGroup;
    imagesData: ImageInfo[] | undefined;
    onImageClick: (image: ImageInfo) => void;
}

// Helper function to interpolate values based on zoom
function interpolate(currentValue: number, minThreshold: number, maxThreshold: number, minValue: number, maxValue: number): number {
    if (currentValue <= minThreshold) return minValue;
    if (currentValue >= maxThreshold) return maxValue;
    const range = maxThreshold - minThreshold;
    const valueRange = maxValue - minValue;
    return minValue + ((currentValue - minThreshold) / range) * valueRange;
}
// src/imageMarkerUtils.ts (continued)

export const updateImageMarkersOnMap = (params: UpdateImageMarkersParams): void => {
    const { L, map, imagesLayer, imagesData, onImageClick } = params;

    imagesLayer.clearLayers();
    if (!imagesData || imagesData.length === 0) return;

    const currentZoom = map.getZoom();
    const currentBounds = map.getBounds();
    const imagesToShow: ImageInfo[] = [];

    // ... (filtering logic for imagesToShow remains the same) ...
    if (currentZoom <= COUNTRY_REPRESENTATIVE_MAX_ZOOM) {
        const displayedCountries = new Set<string>();
        imagesData.forEach(image => {
            if (image.country && !displayedCountries.has(image.country)) {
                if (currentBounds.contains(L.latLng(image.lat, image.lng))) { imagesToShow.push(image); displayedCountries.add(image.country); }
            } else if (!image.country) {
                if (currentBounds.contains(L.latLng(image.lat, image.lng))) { imagesToShow.push(image); }
            }
        });
    } else {
        imagesData.forEach(image => {
            if (currentBounds.contains(L.latLng(image.lat, image.lng))) { imagesToShow.push(image); }
        });
    }

    imagesToShow.forEach(image => {
        const polaroidText = image.caption || image.country || "Untitled";
        const safePolaroidText = polaroidText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        // 1. Calculate dynamic photo width based on current zoom
        let dynamicPhotoWidth = interpolate(
            currentZoom,
            ZOOM_LEVEL_FOR_MIN_SIZE,
            ZOOM_LEVEL_FOR_MAX_SIZE,
            MIN_PHOTO_WIDTH_TARGET,
            MAX_PHOTO_WIDTH_TARGET
        );
        dynamicPhotoWidth = Math.max(20, Math.round(dynamicPhotoWidth)); // Ensure a minimum practical size
        const dynamicPhotoHeight = dynamicPhotoWidth; // Maintain 1:1 aspect ratio

        // 2. Calculate scale factor relative to base dimensions (where photo width is MAX_PHOTO_WIDTH_TARGET)
        const scaleFactor = dynamicPhotoWidth / MAX_PHOTO_WIDTH_TARGET;

        // 3. Calculate all other dimensions and style properties dynamically
        const dynamicBorderUniform = Math.max(4, Math.round(BASE_BORDER_UNIFORM * scaleFactor));
        const dynamicCaptionAreaHeight = Math.max(15, Math.round(BASE_CAPTION_AREA_HEIGHT * scaleFactor));
        const dynamicPinVisualOffset = Math.max(10, Math.round(BASE_PIN_VISUAL_OFFSET * scaleFactor));
        const dynamicPinFontSize = Math.max(14, Math.round(BASE_PIN_FONT_SIZE * scaleFactor));
        const dynamicCaptionFontSize = Math.max(8, Math.round(BASE_CAPTION_FONT_SIZE * scaleFactor));
        const dynamicRotationBuffer = Math.max(6, Math.round(BASE_ROTATION_BUFFER * scaleFactor));

        // 4. Recalculate paper and icon container dimensions
        const dynamicPolaroidPaperWidth = dynamicPhotoWidth + (2 * dynamicBorderUniform);
        const dynamicPolaroidPaperHeight = dynamicBorderUniform + dynamicPhotoHeight + dynamicCaptionAreaHeight;

        const dynamicIconContainerWidth = dynamicPolaroidPaperWidth + dynamicRotationBuffer;
        const dynamicIconContainerHeight = dynamicPolaroidPaperHeight + dynamicPinVisualOffset + dynamicRotationBuffer;

        // 5. Calculate dynamic icon anchor
        const dynamicIconAnchorX = dynamicIconContainerWidth / 2;
        const dynamicIconAnchorY = dynamicPinVisualOffset + (dynamicRotationBuffer / 2);

        // 6. HTML structure with inline styles for dynamic properties
        const iconHtml = `
            <div class="map-marker-polaroid-outer-container">
                <div class="map-marker-polaroid-card" style="
                    width: ${dynamicPolaroidPaperWidth}px;
                    height: ${dynamicPolaroidPaperHeight}px;
                    padding-top: ${dynamicBorderUniform}px;
                    padding-left: ${dynamicBorderUniform}px;
                    padding-right: ${dynamicBorderUniform}px;
                    margin-top: ${dynamicPinVisualOffset}px;
                    /* Tilt is applied via CSS class */
                ">
                    <div class="map-marker-polaroid-pin" style="
                        font-size: ${dynamicPinFontSize}px;
                        top: calc(-1 * ${dynamicPinVisualOffset}px + ${Math.round(4 * scaleFactor)}px);
                    ">📌</div>
                    <div class="map-marker-polaroid-image" style="
                        background-image: url('${image.url}');
                        width: ${dynamicPhotoWidth}px;
                        height: ${dynamicPhotoHeight}px;
                        border-width: ${Math.max(1, Math.round(1 * scaleFactor))}px; /* Scale border subtly */
                    "></div>
                    <div class="map-marker-polaroid-caption" style="
                        height: ${dynamicCaptionAreaHeight}px;
                        margin: ${dynamicBorderUniform}px; /* Space between photo and caption */
                    ">
                        <p class="map-marker-caption-text" style="font-size: ${dynamicCaptionFontSize}px;">
                            ${safePolaroidText}
                        </p>
                    </div>
                </div>
            </div>
        `;

        const icon = L.divIcon({
            html: iconHtml,
            className: 'leaflet-polaroid-marker-wrapper',
            iconSize: [dynamicIconContainerWidth, dynamicIconContainerHeight],
            iconAnchor: [dynamicIconAnchorX, dynamicIconAnchorY],
            popupAnchor: [0, -(dynamicPolaroidPaperHeight / 2) - dynamicPinVisualOffset]
        });

        const marker = L.marker([image.lat, image.lng], { icon })
            .addTo(imagesLayer);

        marker.on('click', () => {
            onImageClick(image);
        });
    });
};