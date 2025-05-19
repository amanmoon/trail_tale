import type { Map as LeafletMap, LayerGroup as LeafletLayerGroup } from 'leaflet';
import type LType from 'leaflet';

export interface ImageItem {
    id: string;          // Unique ID for this specific image item
    url: string;         // Local storage key for Base64 data, or a direct placeholder URL for sample data
    dateAdded: string;   // ISO string
}

export interface ImageInfo { // This represents an Album
    id: string;
    title: string;
    description?: string;
    albumCover: ImageItem;
    images: ImageItem[];      // List of ImageItems within this album
    lat: number;             // Latitude for the album's location
    lng: number;             // Longitude for the album's location
    country?: string;
    dateCreated: string;      // ISO string
    lastUpdated: string;      // ISO string
}

export interface GalleryPageActualProps {
    initialAlbumsData: ImageInfo[];
}


export interface CurrentPanelFormData {
    title: string;
    description?: string;
    albumCoverUrl: string;
    albumDate: string;
}
export interface ImageEditPanelProps {
    imageInfo: ImageInfo;
    onSave: (updatedAlbumInfo: ImageInfo) => void;
    onClose: () => void;
    isOpen: boolean;
    onStartPickLocation: (currentFormData: CurrentPanelFormData) => void;
    onDelete: (albumId: string) => void;
}
export interface CountryFeatureProperties { name: string; }
export interface CountryFeature extends GeoJSON.Feature<GeoJSON.Geometry, CountryFeatureProperties> { }
export interface GalleryPageProps { imagesData: ImageInfo[]; } // imagesData is an array of Albums

export interface UpdateImageMarkersParams {
    L: typeof LType;
    map: LeafletMap;
    imagesLayer: LeafletLayerGroup;
    imagesData: ImageInfo[] | undefined;
    onImageClick: (image: ImageInfo) => void;
}