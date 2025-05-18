// src/ImageEditPanel.tsx

import React, { useState, useEffect, useRef } from 'react';
import type { ImageInfo } from './imageMarkerUtils'; // Assuming ImageInfo is { id, lat, lng, url, ... }
import { FaEdit, FaTrash } from 'react-icons/fa';

// import './ImageEditPanel.css'; // Ensure styles are imported

// Define the shape of the data passed up
export interface CurrentPanelFormData { // Ensure this is exported
    caption: string;
    url: string;
    date: string;
    description?: string; // Add description if it's part of the form data to preserve
}

interface ImageEditPanelProps {
    imageInfo: ImageInfo; // This will be newImageDraft when adding new
    onSave: (updatedImageInfo: ImageInfo) => void;
    onClose: () => void;
    isOpen: boolean;
    onStartPickLocation: (currentFormData: CurrentPanelFormData) => void;
    onDelete: (imageId: string) => void;
}

export function ImageEditPanel({
    imageInfo,
    onSave,
    onClose,
    isOpen,
    onStartPickLocation,
    onDelete,
}: ImageEditPanelProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [url, setUrl] = useState('');
    const [date, setDate] = useState('');
    const [caption, setCaption] = useState('');
    const [description, setDescription] = useState('');
    const editingImageRef = useRef<ImageInfo | null>(null); // To track if imageInfo prop instance changes

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const currentImage = imageInfo; // imageInfo is the prop from GalleryPage
            if (currentImage) {
                setUrl(currentImage.url || '');
                setCaption(currentImage.caption || currentImage.country || '');
                setDescription(currentImage.description || '');
                // For a new image, date might be pre-filled by GalleryPage, or use current if not set
                setDate(String(currentImage.date || (currentImage.id === "NEW_IMAGE_TEMP_ID" ? new Date().toISOString().split('T')[0] : '')));

                // Determine edit mode only when the panel opens for a *different* image or for the first time.
                // This prevents toggling edit mode if lat/lng updates for the same image.
                if (!editingImageRef.current || editingImageRef.current.id !== currentImage.id || (editingImageRef.current.id === currentImage.id && !isEditing && currentImage.id !== "NEW_IMAGE_TEMP_ID") ) {
                     setIsEditing(currentImage.id === "NEW_IMAGE_TEMP_ID" || !currentImage.url); // Start editing for new or if no URL (implies new)
                }
                editingImageRef.current = currentImage;
            }
        } else {
            // Reset when panel closes
            setShowDeleteConfirm(false);
            // Consider resetting editingImageRef.current = null if panel closes completely
            // so that next open behaves like a fresh open.
            editingImageRef.current = null;
        }
    }, [imageInfo, isOpen]); // Removed isEditing from deps

    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false); // Ensure edit mode is off when panel is not open
            setShowDeleteConfirm(false);
        }
    }, [isOpen]);


    const handleEditClick = () => {
        if (imageInfo) { // imageInfo should be valid if this button is visible
            // Populate form fields from imageInfo if not already done by useEffect
            setUrl(imageInfo.url || '');
            setDate(String(imageInfo.date || ''));
            setCaption(imageInfo.caption || imageInfo.country || '');
            setDescription(imageInfo.description || '');
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
         if (imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID") { // If editing an existing image
            setIsEditing(false);
            // Re-populate from imageInfo to discard edits (useEffect should also handle this if imageInfo didn't change)
            setUrl(imageInfo.url || '');
            setCaption(imageInfo.caption || imageInfo.country || '');
            setDescription(imageInfo.description || '');
            setDate(String(imageInfo.date || ''));
        } else { // If it was a new image form, cancel means close the panel
            onClose();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageInfo) return;

        const updatedImageDetails: ImageInfo = {
            ...imageInfo, // This includes id, lat, lng
            url: url,
            date: date,
            caption: caption,
            description: description,
        };
        onSave(updatedImageDetails); // GalleryPage handles logic (add new vs update existing)
        // Don't setIsEditing(false) here if onSave itself closes the panel,
        // but if it's for adding a new image and location is missing, GalleryPage keeps it open.
        // If successfully saved, GalleryPage will close the new image panel.
        // If successfully saved an edit, GalleryPage will close the edit panel.
    };

    const handlePickLocationFromMapClick = () => {
        // Call prop with current form values
        onStartPickLocation({ caption, url, date, description });
    };

    const handleDeleteInitiate = () => setShowDeleteConfirm(true);
    const handleConfirmDelete = () => {
        if (imageInfo) {
            onDelete(imageInfo.id);
            setShowDeleteConfirm(false);
            onClose(); // Close panel after deletion
        }
    };
    const handleCancelDelete = () => setShowDeleteConfirm(false);

    const displayImageUrl = imageInfo?.url || '';
    const displayCaption = imageInfo?.caption || imageInfo?.country || (imageInfo?.id === "NEW_IMAGE_TEMP_ID" ? "New Image" : 'Untitled Image');
    const displayDescription = imageInfo?.description || '';

    // For displaying Lat/Lng in edit mode
    const currentLatDisplay = (imageInfo?.lat === 0 && imageInfo?.lng === 0 && imageInfo.id === "NEW_IMAGE_TEMP_ID")
        ? "Pick Location"
        : imageInfo?.lat?.toFixed(4) || "N/A";
    const currentLngDisplay = (imageInfo?.lat === 0 && imageInfo?.lng === 0 && imageInfo.id === "NEW_IMAGE_TEMP_ID")
        ? "Pick Location"
        : imageInfo?.lng?.toFixed(4) || "N/A";


    return (
        <div className={`slide-panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className={`slide-panel ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose} aria-label="Close panel">&times;</button>

                <div className="panel-content">
                    {!isEditing && imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID" && (
                        <div className="panel-display-mode">
                            <div className="image-container">
                                <img
                                    src={displayImageUrl}
                                    alt={displayCaption}
                                    className="panel-image-large"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found'; }}
                                />
                            </div>
                            <h1>{displayCaption}</h1>
                            {displayDescription && <h3>{displayDescription}</h3>}
                            <div className="details-group">
                                <p><strong>Date:</strong> {imageInfo.date || 'N/A'}</p>
                                {imageInfo.country && <p><strong>Country:</strong> {imageInfo.country}</p>}
                            </div>
                            <div className='panel-long-lat'>
                                <p><strong>Longitude:</strong> {imageInfo.lng?.toFixed(4) || 'N/A'}</p>
                                <p><strong>Latitude:</strong> {imageInfo.lat?.toFixed(4) || 'N/A'}</p>
                            </div>
                        </div>
                    )}

                    {isEditing && imageInfo && ( // imageInfo must exist if editing
                        <div className="panel-edit-mode">
                            {(url || imageInfo.url) && (
                                <div className="form-group form-image-preview-container">
                                    <img
                                        src={url || imageInfo.url || ""}
                                        alt="Preview"
                                        className="form-image-preview"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                        onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'block'; }}
                                    />
                                </div>
                            )}
                            {!url && !imageInfo.url && (
                                <div className="form-group form-image-preview-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', border: '1px dashed #ccc' }}>
                                    <span>Image preview once URL is entered</span>
                                </div>
                            )}
                            <h4>{imageInfo.id === "NEW_IMAGE_TEMP_ID" ? "Add New Image Details" : "Edit Image Details"}</h4>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label htmlFor="imageUrl">Image URL:</label>
                                    <input type="url" id="imageUrl" value={url} onChange={(e) => setUrl(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="imageCaption">Caption / Title:</label>
                                    <input type="text" id="imageCaption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={50} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="imageDescription">Description:</label>
                                    <textarea id="imageDescription" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={4} style={{ width: '100%', resize: 'vertical' }}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="imageDate">Date (YYYY-MM-DD):</label>
                                    <input type="text" id="imageDate" value={date} onChange={(e) => setDate(e.target.value)} pattern="\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])" placeholder="YYYY-MM-DD" required />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="locationDisplayGroup">Location (Lon, Lat)</label>
                                    <div className="location-input-group" id="locationDisplayGroup">
                                        <div className="coordinates-text">
                                            <span>Lon: {currentLngDisplay}</span>
                                            <span>Lat: {currentLatDisplay}</span>
                                        </div>
                                        <button type="button" onClick={handlePickLocationFromMapClick} className="pick-location-icon-btn" aria-label="Pick location" title="Pick location">📍</button>
                                    </div>
                                </div>
                                <div className="panel-actions">
                                    <button type="submit" className="primary">{imageInfo.id === "NEW_IMAGE_TEMP_ID" ? "Add Image" : "Save Changes"}</button>
                                    <button type="button" onClick={handleCancelEdit} className="secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {!isEditing && imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID" && (
                    <>
                        <button type="button" onClick={handleDeleteInitiate} className="delete-trash-button" aria-label="Delete Image" title="Delete Image">
                            <FaTrash/>
                        </button>
                        <button type="button" onClick={handleEditClick} className="edit-pencil-button" aria-label="Edit Details" title="Edit Details">
                            <FaEdit />
                        </button>
                    </>
                )}

                {showDeleteConfirm && (
                    <div className="confirm-delete-overlay">
                        <div className="confirm-delete-dialog">
                            <p>Do you really want to delete this image?</p>
                            <div className="confirm-delete-actions">
                                <button onClick={handleConfirmDelete} className="button-danger">Yes, Delete</button>
                                <button onClick={handleCancelDelete} className="button-secondary">Go Back</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}