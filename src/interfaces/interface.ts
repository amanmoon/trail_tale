import type { Map as LeafletMap, LayerGroup as LeafletLayerGroup } from 'leaflet';
import type LType from 'leaflet';

export interface ImageItem {
    id: string;
    url: string;
    dateAdded: string;
}

export interface ImageInfo {
    id: string;
    title: string;
    description?: string;
    albumCover: ImageItem;
    images: ImageItem[];
    lat: number;
    lng: number;
    country?: string;
    dateCreated: string;
    lastUpdated: string;
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
export interface GalleryPageProps { imagesData: ImageInfo[]; } 
export interface UpdateImageMarkersParams {
    L: typeof LType;
    map: LeafletMap;
    imagesLayer: LeafletLayerGroup;
    imagesData: ImageInfo[] | undefined;
    onImageClick: (image: ImageInfo) => void;
}