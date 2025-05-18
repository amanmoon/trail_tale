"use client";

import MapGallery from "./mapGallery";

export interface ImageInfo {
    id: string;
    lat: number;
    lng: number;
    url: string;
    country?: string;
    caption?: string;
    description?: string;
    date?: string; // New: Timestamp (ISO string format recommended for datetime-local input)
}

interface GalleryPageProps {
    imagesData: ImageInfo[]; // This will be the new prop
}

const myImages: ImageInfo[] = [
    {
        id: 'img1', lat: 51.505, lng: -0.09, url: 'https://plus.unsplash.com/premium_photo-1671734045856-88673602ef20?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', country: 'United Kingdom', caption:
            '',  description: '', date: "2025-05-18"
    },
    {
        id: 'img2', lat: 51.515, lng: -0.10, url: 'https://plus.unsplash.com/premium_photo-1679470210717-97fc30968fdf?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', country: 'United Kingdom', caption:
            '',  description: '', date: "2025-05-18"
    },
    {
        id: 'img3', lat: 48.8566, lng: 2.3522, url: 'https://plus.unsplash.com/premium_photo-1661956135713-f93a5a95904d?q=80&w=2084&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', country: 'France', caption:
            '',  description: '', date: "2025-05-18"
    },
    {
        id: 'img4', lat: 40.7128, lng: -74.0060, url: 'https://via.placeholder.com/40x40.png?text=US', country: 'United States of America', caption:
            '',  description: '', date: "2025-05-18"
    },
    {
        id: 'img5', lat: 35.6895, lng: 139.6917, url: 'https://via.placeholder.com/40x40.png?text=JP', country: 'Japan', caption:
            '', description: '', date: "2025-05-18"
    },
    // Add more images from your dictionary
];

export default function GalleryPage() {
    return (<><MapGallery imagesData={myImages} /></>)
}