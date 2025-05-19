"use client";

import React from 'react';
import MapGallery from "../../component/mapComponent/mapGallery";
import { ImageInfo } from '@/interfaces/interface';
import { useEffect } from 'react';
const sampleAlbums: ImageInfo[] = [
];

export default function GalleryPage() {
    useEffect(() => {
        const handleBeforeUnload = () => {
            localStorage.clear();
            console.log('localStorage has been cleared as the site is being quit/closed.');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };

    }, []);
    return (
        <>
            {/* <Navbar />  // Assuming Navbar is another component */}
            <MapGallery imagesData={sampleAlbums} /> {/* Pass the new sample data */}
        </>
    );
}