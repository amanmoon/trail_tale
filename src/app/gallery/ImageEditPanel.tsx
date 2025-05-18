// src/ImageEditPanel.tsx

import React, { useState, useEffect, useRef } from 'react';
import type { ImageInfo } from './imageMarkerUtils';
// import './ImageEditPanel.css'; // Ensure styles are imported

// Define the shape of the data passed up
interface CurrentPanelFormData {
    caption: string;
    url: string;
}

interface ImageEditPanelProps {
    imageInfo: ImageInfo;
    onSave: (updatedImageInfo: ImageInfo) => void;
    onClose: () => void;
    isOpen: boolean;
    onStartPickLocation: (currentFormData: CurrentPanelFormData) => void; // MODIFIED PROP
    onDelete: (imageId: string) => void; // <<<< NEW PROP
}
// src/ImageEditPanel.tsx
// ... imports ...

export function ImageEditPanel({
    imageInfo,
    onSave,
    onClose,
    isOpen,
    onStartPickLocation,
    onDelete, // <<<< Destructure new prop
}: ImageEditPanelProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [url, setUrl] = useState(imageInfo?.url || ''); // Use optional chaining
    const [date, setDate] = useState(String(imageInfo?.date || ''));
    // const [lng, setLng] = useState(String(imageInfo?.lng || '')); // No longer directly used for input
    // const [currentLng, setCurrentLng] = useState<string>(imageInfo?.lng?.toFixed(4) || 'N/A'); // From previous JSX
    // const [currentLat, setCurrentLat] = useState<string>(imageInfo?.lat?.toFixed(4) || 'N/A'); // From previous JSX
    const [caption, setCaption] = useState(imageInfo?.caption || imageInfo?.country || '');
    const [description, setDescription] = useState(imageInfo?.description || '');
    const editingImageRef = useRef<ImageInfo | null>(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // <<<< NEW STATE

    // Effect to initialize/reset form fields based on imageInfo and isOpen
    useEffect(() => {
        if (isOpen) {
            const currentImage = imageInfo; // Use a local const for clarity
            if (currentImage && currentImage.id !== "NEW_IMAGE_TEMP_ID") { // Existing image
                setUrl(currentImage.url || '');
                setCaption(currentImage.caption || currentImage.country || '');
                setDescription(currentImage.description || '');
                setDate(String(currentImage.date || ''));
                // setCurrentLng(currentImage.lng?.toFixed(4) || 'N/A');
                // setCurrentLat(currentImage.lat?.toFixed(4) || 'N/A');
                if (editingImageRef.current?.id !== currentImage.id || !isEditing) { // Reset to display if different image or not already editing
                     setIsEditing(false);
                }
            } else { // New image placeholder, or if imageInfo is null
                const defaultDate = new Date().toISOString().split('T')[0];
                setUrl(currentImage?.url || '');
                setCaption(currentImage?.caption || '');
                setDescription(currentImage?.description || '');
                setDate(String(currentImage?.date || defaultDate));
                // setCurrentLng(currentImage?.lng && currentImage.lng !== 0 ? currentImage.lng.toFixed(4) : 'Pick location');
                // setCurrentLat(currentImage?.lat && currentImage.lat !== 0 ? currentImage.lat.toFixed(4) : 'Pick location');
                setIsEditing(true); // Start in edit mode for a new image
            }
            editingImageRef.current = currentImage;
        } else {
             // Reset showDeleteConfirm when panel closes, regardless of how
            setShowDeleteConfirm(false);
        }
    }, [imageInfo, isOpen, isEditing]); // isEditing added to deps for specific reset scenarios


    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
            // setShowDeleteConfirm(false); // Also reset here if panel is closed externally
        }
    }, [isOpen]);


    const handleEditClick = () => {
        // ... (your existing handleEditClick logic)
        if (imageInfo) {
            setUrl(imageInfo.url || '');
            setDate(String(imageInfo.date || ''));
            // setLng(String(imageInfo.lng)); // Not directly used for controlled input
            setCaption(imageInfo.caption || imageInfo.country || '');
            setDescription(imageInfo.description || '');
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        // ... (your existing handleCancelEdit logic)
         if (imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID") {
            setIsEditing(false);
            // Re-populate from imageInfo to discard edits
            setUrl(imageInfo.url || '');
            setCaption(imageInfo.caption || imageInfo.country || '');
            setDescription(imageInfo.description || '');
            setDate(String(imageInfo.date || ''));
        } else {
            onClose(); // If it was a new image form, cancel closes it
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        // ... (your existing handleSubmit logic)
        e.preventDefault();
        // Guard against imageInfo possibly being null if logic allows
        if (!imageInfo) {
            console.error("Attempted to save without imageInfo.");
            return;
        }
        const updatedImageDetails: ImageInfo = {
            ...imageInfo,
            url: url,
            date: date,
            caption: caption,
            description: description
        };
        onSave(updatedImageDetails);
        setIsEditing(false);
    };

    const handlePickLocationFromMapClick = () => {
        // ... (your existing handlePickLocationFromMapClick logic)
         onStartPickLocation({ caption: caption, url: url});
    };

    // --- Handlers for Delete Functionality ---
    const handleDeleteInitiate = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        if (imageInfo) {
            onDelete(imageInfo.id); // Call parent's delete handler
            setShowDeleteConfirm(false);
            onClose(); // Close the panel after deletion
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
    };
    // --- End Delete Handlers ---

    // Fallbacks for display, using imageInfo directly as it's the source of truth for display
    const displayImageUrl = imageInfo?.url || '';
    const displayCaption = imageInfo?.caption || imageInfo?.country || (imageInfo?.id === "NEW_IMAGE_TEMP_ID" ? "New Image" : 'Untitled Image');
    const displayDescription = imageInfo?.description || '';


    return (
        <div className={`slide-panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className={`slide-panel ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose} aria-label="Close panel">&times;</button>

                <div className="panel-content">
                    {/* ===================== DISPLAY MODE ===================== */}
                    {!isEditing && imageInfo && (
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

                    {/* ===================== EDIT MODE ===================== */}
                    {isEditing && ( // Removed imageInfo check here, assuming if isEditing, imageInfo (or placeholder) is set
                        <div className="panel-edit-mode">
                            {(url || (imageInfo && imageInfo.url)) && (
                                <div className="form-group form-image-preview-container">
                                    <img /* ... preview image props ... */
                                        src={url || (imageInfo && imageInfo.url) || ""}
                                        alt="Preview"
                                        className="form-image-preview"
                                        onError={(e) => { /* ... */ }}
                                        onLoad={(e) => { /* ... */ }}
                                    />
                                </div>
                            )}
                            {!url && !(imageInfo && imageInfo.url) && ( /* Placeholder for no image URL */
                                <div className="form-group form-image-preview-container" style={{ display: 'flex', /* ... */ }}>
                                    <span>No image URL provided</span>
                                </div>
                            )}
                            <h3>{imageInfo && imageInfo.id === "NEW_IMAGE_TEMP_ID" ? "Add New Image Details" : "Edit Image Details"}</h3>
                            <form onSubmit={handleSubmit}>
                                {/* ... your form groups for URL, Caption, Description, Date ... */}
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
                                    <textarea id="imageDescription" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={4} style={{ width: '100%', /*...*/ }}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="imageDate">Date:</label>
                                    <input type="text" id="imageDate" value={date} onChange={(e) => setDate(e.target.value)} pattern="\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])" required />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="locationDisplayGroup">Location (Lon, Lat)</label>
                                    <div className="location-input-group" id="locationDisplayGroup">
                                        <div className="coordinates-text">
                                            <span>Lon: {imageInfo?.lng?.toFixed(4) || 'N/A'}</span>
                                            <span>Lat: {imageInfo?.lat?.toFixed(4) || 'N/A'}</span>
                                        </div>
                                        <button type="button" onClick={handlePickLocationFromMapClick} className="pick-location-icon-btn" aria-label="Pick location" title="Pick location">📍</button>
                                    </div>
                                </div>
                                <div className="panel-actions">
                                    <button type="submit" className="primary">{imageInfo && imageInfo.id === "NEW_IMAGE_TEMP_ID" ? "Add Image" : "Save Changes"}</button>
                                    <button type="button" onClick={handleCancelEdit} className="secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div> {/* End .panel-content */}

                {/* --- Floating Action Buttons (Edit and Delete) --- */}
                {/* Rendered as siblings to panel-content, relative to slide-panel */}
                {!isEditing && imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID" && ( // Don't show actions for a 'new' unsaved image
                    <>
                        <button
                            type="button"
                            onClick={handleDeleteInitiate} // <<<< NEW
                            className="delete-trash-button" // <<<< NEW CLASS
                            aria-label="Delete Image"
                            title="Delete Image"
                        >
                            🗑️
                        </button>
                        <button
                            type="button"
                            onClick={handleEditClick}
                            className="edit-pencil-button"
                            aria-label="Edit Details"
                            title="Edit Details"
                        >
                            ✏️
                        </button>
                    </>
                )}
                {/* --- End Floating Action Buttons --- */}


                {/* --- Confirmation Dialog --- */}
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
                {/* --- End Confirmation Dialog --- */}

            </div> {/* End .slide-panel */}
        </div> /* End .slide-panel-overlay */
    );
}