"use client";

import React from 'react';
import MapGallery from "../../component/mapComponent/mapGallery";
import { ImageInfo } from '@/interfaces/interface';
const sampleAlbums: ImageInfo[] = [
    {
        id: 'album1',
        title: 'London Adventures',
        description: 'A collection of moments from my trip to London.',
        albumCover: {
            id: 'cover_london',
            url: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?q=80&w=800&auto=format&fit=crop', // Placeholder
            dateAdded: '2025-05-10T10:00:00Z',
        },
        images: [
            { id: 'london_img1', url: 'https://images.unsplash.com/photo-1505761671935-60b3a7427508?q=80&w=800&auto=format&fit=crop', dateAdded: '2025-05-10T10:05:00Z' },
            { id: 'london_img2', url: 'https://images.unsplash.com/photo-1529655683826-1c92cf25b5c7?q=80&w=800&auto=format&fit=crop', dateAdded: '2025-05-10T10:10:00Z' },
        ],
        lat: 51.505,
        lng: -0.09,
        country: 'United Kingdom',
        dateCreated: '2025-05-10T09:00:00Z',
        lastUpdated: '2025-05-11T14:30:00Z',
    },
    {
        id: 'album2',
        title: 'Parisian Dreams',
        description: 'Exploring the beautiful city of Paris.',
        albumCover: {
            id: 'cover_paris',
            url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop', // Placeholder
            dateAdded: '2025-04-20T11:00:00Z',
        },
        images: [
            { id: 'paris_img1', url: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?q=80&w=800&auto=format&fit=crop', dateAdded: '2025-04-20T11:05:00Z' },
        ],
        lat: 48.8566,
        lng: 2.3522,
        country: 'France',
        dateCreated: '2025-04-20T09:00:00Z',
        lastUpdated: '2025-04-22T16:00:00Z',
    },
    {
        id: 'album3',
        title: 'New York City Vibes',
        albumCover: {
            id: 'cover_nyc',
            url: 'https://images.unsplash.com/photo-1496442226696-b4d988801892?q=80&w=800&auto=format&fit=crop', // Placeholder
            dateAdded: '2025-03-15T12:00:00Z',
        },
        images: [], // Album with no internal images yet, just a cover
        lat: 40.7128,
        lng: -74.0060,
        country: 'United States of America',
        dateCreated: '2025-03-15T10:00:00Z',
        lastUpdated: '2025-03-15T10:00:00Z',
    },
    {
        id: 'album4',
        title: 'Tokyo Expedition',
        albumCover: {
            id: 'cover_tokyo',
            url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=800&auto=format&fit=crop', // Placeholder
            dateAdded: '2025-02-10T13:00:00Z',
        },
        images: [
            { id: 'tokyo_img1', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800&auto=format&fit=crop', dateAdded: '2025-02-10T13:05:00Z' },
            { id: 'tokyo_img2', url: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?q=80&w=800&auto=format&fit=crop', dateAdded: '2025-02-10T13:10:00Z' },
            { id: 'tokyo_img3', url: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?q=80&w=800&auto=format&fit=crop', dateAdded: '2025-02-10T13:15:00Z' },
        ],
        lat: 35.6895,
        lng: 139.6917,
        country: 'Japan',
        dateCreated: '2025-02-10T12:00:00Z',
        lastUpdated: '2025-02-11T18:20:00Z',
    }
];

export default function GalleryPage() {
    return (
        <>
            {/* <Navbar />  // Assuming Navbar is another component */}
            <MapGallery imagesData={sampleAlbums} /> {/* Pass the new sample data */}
        </>
    );
}