
import { ImageInfo, UpdateImageMarkersParams} from '@/interfaces/interface';
const BASE_PHOTO_WIDTH: number = 160;
const BASE_BORDER_UNIFORM: number = 12;  
const BASE_CAPTION_AREA_HEIGHT: number = 30;
const BASE_PIN_VISUAL_OFFSET: number = 25;
const BASE_PIN_FONT_SIZE: number = 30;
const BASE_CAPTION_FONT_SIZE: number = 14;
const BASE_ROTATION_BUFFER: number = 12;

const MIN_PHOTO_WIDTH_TARGET: number = 40;
const MAX_PHOTO_WIDTH_TARGET: number = BASE_PHOTO_WIDTH;

const ZOOM_LEVEL_FOR_MIN_SIZE: number = 7;
const ZOOM_LEVEL_FOR_MAX_SIZE: number = 13;

const COUNTRY_REPRESENTATIVE_MAX_ZOOM = 5;

function interpolate(currentValue: number, minThreshold: number, maxThreshold: number, minValue: number, maxValue: number): number {
    if (currentValue <= minThreshold) return minValue;
    if (currentValue >= maxThreshold) return maxValue;
    const range = maxThreshold - minThreshold;
    const valueRange = maxValue - minValue;
    return minValue + ((currentValue - minThreshold) / range) * valueRange;
}

export const updateImageMarkersOnMap = (params: UpdateImageMarkersParams): void => {
    const { L, map, imagesLayer, imagesData, onImageClick } = params;

    imagesLayer.clearLayers();
    if (!imagesData || imagesData.length === 0) return;

    const currentZoom = map.getZoom();
    const currentBounds = map.getBounds();
    const imagesToShow: ImageInfo[] = [];

    if (currentZoom <= COUNTRY_REPRESENTATIVE_MAX_ZOOM) {
        const displayedCountries = new Set<string>();
        imagesData.forEach(album => {
            if (album.country && !displayedCountries.has(album.country)) {
                if (currentBounds.contains(L.latLng(album.lat, album.lng))) {
                    imagesToShow.push(album); displayedCountries.add(album.country);
                }
            } else if (!album.country) {
                if (currentBounds.contains(L.latLng(album.lat, album.lng))) { imagesToShow.push(album); }
            }
        });
    } else {
        imagesData.forEach(album => {
            if (currentBounds.contains(L.latLng(album.lat, album.lng))) { imagesToShow.push(album); }
        });
    }

    imagesToShow.forEach(album => {
        const polaroidText = album.title || album.country || "Untitled Album";
        const safePolaroidText = polaroidText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        let dynamicPhotoWidth = interpolate(
            currentZoom, ZOOM_LEVEL_FOR_MIN_SIZE, ZOOM_LEVEL_FOR_MAX_SIZE,
            MIN_PHOTO_WIDTH_TARGET, MAX_PHOTO_WIDTH_TARGET
        );
        dynamicPhotoWidth = Math.max(20, Math.round(dynamicPhotoWidth));
        const dynamicPhotoHeight = dynamicPhotoWidth;

        const scaleFactor = dynamicPhotoWidth / MAX_PHOTO_WIDTH_TARGET;

        const dynamicBorderUniform = Math.max(4, Math.round(BASE_BORDER_UNIFORM * scaleFactor));
        const dynamicCaptionAreaHeight = Math.max(15, Math.round(BASE_CAPTION_AREA_HEIGHT * scaleFactor));
        const dynamicPinVisualOffset = Math.max(10, Math.round(BASE_PIN_VISUAL_OFFSET * scaleFactor));
        const dynamicPinFontSize = Math.max(14, Math.round(BASE_PIN_FONT_SIZE * scaleFactor));
        const dynamicCaptionFontSize = Math.max(8, Math.round(BASE_CAPTION_FONT_SIZE * scaleFactor));
        const dynamicRotationBuffer = Math.max(6, Math.round(BASE_ROTATION_BUFFER * scaleFactor));

        const dynamicPolaroidPaperWidth = dynamicPhotoWidth + (2 * dynamicBorderUniform);
        const cardInternalContentHeight = dynamicPhotoHeight + dynamicBorderUniform + dynamicCaptionAreaHeight;
        const dynamicPolaroidPaperHeight = dynamicBorderUniform + cardInternalContentHeight;


        const dynamicIconContainerWidth = dynamicPolaroidPaperWidth + dynamicRotationBuffer;
        const dynamicIconContainerHeight = dynamicPolaroidPaperHeight + dynamicPinVisualOffset + dynamicRotationBuffer;

        const dynamicIconAnchorX = dynamicIconContainerWidth / 2;
        const dynamicIconAnchorY = dynamicPinVisualOffset + (dynamicRotationBuffer / 2);

        const coverImageKey = album.albumCover?.url;
        let imageSrc = '';
        let imageElementHtml: string;

        if (coverImageKey) {
            const base64ImageData = localStorage.getItem(coverImageKey);
            if (base64ImageData) {
                imageSrc = base64ImageData;
            } else {
                console.warn(`Image data not found for key: ${coverImageKey} (Album: ${album.title})`);
            }
        }

        if (imageSrc) {
            imageElementHtml = `<img src="${imageSrc}" alt="${safePolaroidText}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />`;
        } else {
            const fallbackFontSize = Math.max(8, Math.round(10 * scaleFactor));
            imageElementHtml = `
                <div style="width: 100%; height: 100%; background-color: #e0e0e0; display: flex; align-items: center; justify-content: center; text-align: center; font-size: ${fallbackFontSize}px; color: #888; overflow: hidden; box-sizing: border-box; padding: ${Math.round(2 * scaleFactor)}px;">
                    Cover Missing
                </div>`;
        }

        const scaledPhotoBorderWidth = Math.max(1, Math.round(1 * scaleFactor));

        const iconHtml = `
            <div class="map-marker-polaroid-outer-container">
                <div class="map-marker-polaroid-card" style="
                    width: ${dynamicPolaroidPaperWidth}px;
                    height: ${dynamicPolaroidPaperHeight}px;
                    padding-top: ${dynamicBorderUniform}px;
                    padding-left: ${dynamicBorderUniform}px;
                    padding-right: ${dynamicBorderUniform}px;
                    /* The bottom padding is implicitly created by the caption's height and its top margin */
                    margin-top: ${dynamicPinVisualOffset}px;
                ">
                    <div class="map-marker-polaroid-pin" style="
                        font-size: ${dynamicPinFontSize}px;
                        top: calc(-1 * ${dynamicPinVisualOffset}px + ${Math.round(4 * scaleFactor)}px);
                    ">📌</div>
                    <div class="map-marker-polaroid-image" style=" /* Using this class name as per initial CSS */
                        width: ${dynamicPhotoWidth}px;
                        height: ${dynamicPhotoHeight}px;
                        /* Styles from your 'initial CSS' for .map-marker-polaroid-image */
                        border: ${scaledPhotoBorderWidth}px solid #e0e0e0; /* Preferred border color */
                        box-shadow: inset 0 0 ${Math.max(1, Math.round(4 * scaleFactor * 0.5))}px rgba(0,0,0,0.08); /* Adjusted shadow to scale, match initial */
                        overflow: hidden; /* To contain the img tag */
                        background-color: #f0f0f0; /* Fallback if img is transparent or fails (though img has its own fallback) */
                    ">
                        ${imageElementHtml} {/* Inject <img> tag or fallback here */}
                    </div>
                    <div class="map-marker-polaroid-caption" style="
                        height: ${dynamicCaptionAreaHeight}px;
                        margin-top: ${dynamicBorderUniform}px; /* This creates the bottom border space for the photo */
                        /* Ensure caption aligns with photo width, card padding handles side alignment */
                        padding: ${Math.round(2 * scaleFactor)}px ${Math.round(4 * scaleFactor)}px;
                        box-sizing: border-box;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <p class="map-marker-caption-text" style="
                            font-size: ${dynamicCaptionFontSize}px;
                            line-height: 1.2;
                            text-align: center;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                            max-width: 100%;
                        ">
                            ${safePolaroidText}
                        </p>
                    </div>
                </div>
            </div>
        `;

        const icon = L.divIcon({
            html: iconHtml,
            className: `leaflet-polaroid-marker-wrapper`,
            iconSize: [dynamicIconContainerWidth, dynamicIconContainerHeight],
            iconAnchor: [dynamicIconAnchorX, dynamicIconAnchorY],
            popupAnchor: [0, -(dynamicPolaroidPaperHeight / 2) - dynamicPinVisualOffset]
        });

        const marker = L.marker([album.lat, album.lng], { icon })
            .addTo(imagesLayer);

        marker.on('click', () => {
            onImageClick(album);
        });
    });
};