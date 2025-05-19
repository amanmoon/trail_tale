import React, { useState, useEffect, useRef } from 'react';
import { FaEdit, FaTrash, FaArrowLeft, FaPlus } from 'react-icons/fa';
import { ImageInfo, ImageItem, ImageEditPanelProps } from '@/interfaces/interface';
import './ImageEditPanel.css';

const generatePanelUniqueId = (prefix: string = "id") => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
async function convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
}

const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/400x300?text=Cover+Not+Found';
const THUMBNAIL_PLACEHOLDER_URL = 'https://via.placeholder.com/100x100?text=N/A';
const MAX_PREVIEW_IMAGES_IN_DETAILS = 3;

type PanelView = 'displayDetails' | 'editDetails' | 'manageImages';

export function ImageEditPanel({
    imageInfo, // This is the album object from GalleryPage's state
    onSave,    // Prop function from GalleryPage to save the updated album
    onClose,   // Prop function from GalleryPage to close the panel
    isOpen,
    onStartPickLocation,
    onDelete,
}: ImageEditPanelProps) {
    const [panelView, setPanelView] = useState<PanelView>('displayDetails');

    // Form states for album metadata
    const [albumTitle, setAlbumTitle] = useState('');
    const [albumDescription, setAlbumDescription] = useState('');
    const [albumCoverKey, setAlbumCoverKey] = useState('');
    const [albumDate, setAlbumDate] = useState('');

    // State for a newly selected cover file (not yet saved)
    const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
    const [coverFilePreview, setCoverFilePreview] = useState<string | null>(null);

    // States for displayable image sources (Base64 from LS or Blob URL for previews)
    const [displayModeCoverSrc, setDisplayModeCoverSrc] = useState<string | null>(null);
    const [editModePreviewSrc, setEditModePreviewSrc] = useState<string | null>(null);

    // THIS IS THE CRITICAL STATE for internal images during an edit session
    const [editableAlbumImages, setEditableAlbumImages] = useState<ImageItem[]>([]);
    // This map stores displayable srcs for images in editableAlbumImages or imageInfo.images
    const [internalImagesDisplaySrcMap, setInternalImagesDisplaySrcMap] = useState<Record<string, string | null>>({});
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

    const currentlyViewedAlbumIdRef = useRef<string | null>(null);
    // ... (other refs and showDeleteConfirm state)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const internalImageUploadRef = useRef<HTMLInputElement>(null);


    const switchPanelView = (newView: PanelView) => {
        setSelectedImageIds(new Set());
        setPanelView(newView);
    };

    // Main effect to synchronize panel state with imageInfo prop
    useEffect(() => {
        if (isOpen) {
            const currentAlbumProp = imageInfo; // The album passed from GalleryPage
            if (currentAlbumProp) {
                if (currentlyViewedAlbumIdRef.current !== currentAlbumProp.id) {
                    console.log("ImageEditPanel: Initializing for new/different album:", currentAlbumProp.id);
                    setAlbumTitle(currentAlbumProp.title || '');
                    setAlbumDescription(currentAlbumProp.description || '');
                    const coverKeyFromProp = currentAlbumProp.albumCover?.url || '';
                    setAlbumCoverKey(coverKeyFromProp);
                    setAlbumDate(currentAlbumProp.dateCreated || (currentAlbumProp.id === "NEW_IMAGE_TEMP_ID" ? new Date().toISOString().split('T')[0] : ''));

                    setSelectedCoverFile(null); // No new file selected initially
                    setEditableAlbumImages(currentAlbumProp.images ? [...currentAlbumProp.images] : []);
                    setSelectedImageIds(new Set()); // Clear any previous selections

                    if (coverKeyFromProp) {
                        const base64Data = localStorage.getItem(coverKeyFromProp);
                        setDisplayModeCoverSrc(base64Data || null);
                        setEditModePreviewSrc(base64Data || null);
                    } else {
                        setDisplayModeCoverSrc(null);
                        setEditModePreviewSrc(null);
                    }

                    if (currentAlbumProp.id === "NEW_IMAGE_TEMP_ID") {
                        setPanelView('editDetails'); // Start new albums in edit mode
                    } else {
                        setPanelView('displayDetails'); // Start existing albums in display mode
                    }
                    currentlyViewedAlbumIdRef.current = currentAlbumProp.id; // Track this album
                }
            }
        } else { // Panel is closing
            setPanelView('displayDetails');
            // Clear all form and temporary states
            setAlbumTitle(''); setAlbumDescription(''); setAlbumCoverKey(''); setAlbumDate('');
            setSelectedCoverFile(null); setCoverFilePreview(null);
            setDisplayModeCoverSrc(null); setEditModePreviewSrc(null);
            setEditableAlbumImages([]); setInternalImagesDisplaySrcMap({}); setSelectedImageIds(new Set());
            currentlyViewedAlbumIdRef.current = null; // Reset tracked album
            if (coverFileInputRef.current) coverFileInputRef.current.value = "";
            if (internalImageUploadRef.current) internalImageUploadRef.current.value = "";
        }
    }, [imageInfo, isOpen]);


    useEffect(() => {
        if (!isOpen) {
            setPanelView('displayDetails');
            setShowDeleteConfirm(false);
        }
    }, [isOpen]);

    useEffect(() => { /* Effect for selectedCoverFile preview */
        if (selectedCoverFile) {
            const objectUrl = URL.createObjectURL(selectedCoverFile);
            setCoverFilePreview(objectUrl);
            setEditModePreviewSrc(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            if (albumCoverKey) { // albumCoverKey is from the saved imageInfo.albumCover.url
                setEditModePreviewSrc(localStorage.getItem(albumCoverKey) || null);
            } else {
                setEditModePreviewSrc(null);
            }
            setCoverFilePreview(null);
        }
    }, [selectedCoverFile, albumCoverKey]);

    // Effect to load/update display sources for internal images (used by all views showing the list)
    useEffect(() => {
        if (isOpen && imageInfo) { // imageInfo must be valid
            const imageListToFetch = (panelView === 'manageImages')
                ? editableAlbumImages // In manage mode, show sources for the editable list
                : imageInfo.images || []; // In display/edit mode (for preview), show from prop

            const sources: Record<string, string | null> = {};
            imageListToFetch.forEach(imgItem => {
                if (imgItem.url) { // url is LS key
                    sources[imgItem.id] = localStorage.getItem(imgItem.url) || null;
                } else {
                    sources[imgItem.id] = null;
                }
            });
            setInternalImagesDisplaySrcMap(sources);
        }
    }, [isOpen, panelView, imageInfo, editableAlbumImages]); // Rerun if these change


    const switchToEditDetails = () => {
        if (imageInfo) {
            setAlbumTitle(imageInfo.title || '');
            setAlbumDescription(imageInfo.description || '');
            const currentCoverKey = imageInfo.albumCover?.url || '';
            setAlbumCoverKey(currentCoverKey);
            setEditModePreviewSrc(currentCoverKey ? localStorage.getItem(currentCoverKey) || null : null);
            setAlbumDate(imageInfo.dateCreated || '');
            setSelectedCoverFile(null);
            switchPanelView('editDetails');
        }
    };

    const handleCancelEditDetails = () => {
        if (imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID") {
            switchPanelView('displayDetails');
            setAlbumTitle(imageInfo.title || '');
            setAlbumDescription(imageInfo.description || '');
            const currentCoverKey = imageInfo.albumCover?.url || '';
            setAlbumCoverKey(currentCoverKey);
            setDisplayModeCoverSrc(currentCoverKey ? localStorage.getItem(currentCoverKey) || null : null);
            setAlbumDate(imageInfo.dateCreated || '');
            setSelectedCoverFile(null);
            setEditableAlbumImages(imageInfo.images ? [...imageInfo.images] : []); // Reset internal images
        } else {
            onClose(); // If it was a "new album" form
        }
    };

    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedCoverFile(e.target.files?.[0] || null);

    const handleAddInternalImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        const newImageItemsPromises: Promise<ImageItem | null>[] = [];
        for (let i = 0; i < files.length; i++) { const file = files[i]; newImageItemsPromises.push((async (): Promise<ImageItem | null> => { try { const base64ImageData = await convertFileToBase64(file); const newImageId = generatePanelUniqueId("imgInAlbum"); const newImageStorageKey = `img_data_internal_${newImageId}_${file.name.split('.')[0]}`; localStorage.setItem(newImageStorageKey, base64ImageData); return { id: newImageId, url: newImageStorageKey, dateAdded: new Date().toISOString(), }; } catch (error) { console.error("Error processing internal image:", file.name, error); alert(`Failed to process image ${file.name}.`); return null; } })()); }
        const resolvedNewImageItems = (await Promise.all(newImageItemsPromises)).filter(Boolean) as ImageItem[];
        setEditableAlbumImages(prev => [...prev, ...resolvedNewImageItems]);
        if (internalImageUploadRef.current) internalImageUploadRef.current.value = "";
        const updatedAlbumDetails: ImageInfo = {
            ...imageInfo, // Spreads existing fields like id, lat, lng, country
            title: albumTitle,
            description: albumDescription,
            albumCover: imageInfo.albumCover,
            images: resolvedNewImageItems, // Use the filtered list of images
            dateCreated: imageInfo.id === "NEW_IMAGE_TEMP_ID"
                ? (albumDate || new Date().toISOString().split('T')[0])
                : imageInfo.dateCreated,
            lastUpdated: new Date().toISOString(),
        };

        onSave(updatedAlbumDetails); // Send to GalleryPage

    };

    const handleToggleImageSelection = (imageId: string) => { /* ... (same) ... */
        setSelectedImageIds(prevSelected => { const newSelected = new Set(prevSelected); if (newSelected.has(imageId)) { newSelected.delete(imageId); } else { newSelected.add(imageId); } return newSelected; });
    };

    const handleDeleteSelectedImages = () => { /* ... (same - updates editableAlbumImages and LS) ... */
        if (selectedImageIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedImageIds.size} selected image(s)? This action is permanent.`)) return;
        const imagesToKeep: ImageItem[] = []; const urlsToDeleteFromStorage: string[] = [];
        editableAlbumImages.forEach(imgItem => { if (selectedImageIds.has(imgItem.id)) { if (imgItem.url) { urlsToDeleteFromStorage.push(imgItem.url); } } else { imagesToKeep.push(imgItem); } });
        urlsToDeleteFromStorage.forEach(url => localStorage.removeItem(url));

        setEditableAlbumImages(imagesToKeep); setSelectedImageIds(new Set());

        const updatedAlbumDetails: ImageInfo = {
            ...imageInfo, // Spreads existing fields like id, lat, lng, country
            title: albumTitle,
            description: albumDescription,
            albumCover: imageInfo.albumCover,
            images: imagesToKeep, // Use the filtered list of images
            dateCreated: imageInfo.id === "NEW_IMAGE_TEMP_ID"
                ? (albumDate || new Date().toISOString().split('T')[0])
                : imageInfo.dateCreated,
            lastUpdated: new Date().toISOString(),
        };

        onSave(updatedAlbumDetails); // Send to GalleryPage
    };

    const handleSubmitAlbumDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageInfo) return;
        let finalAlbumCoverItem: ImageItem;
        // Logic for handling new cover file or existing cover key
        if (selectedCoverFile) {
            try {
                const base64ImageData = await convertFileToBase64(selectedCoverFile);
                const newCoverId = generatePanelUniqueId("imgItem_cover");
                const newCoverStorageKey = `img_data_cover_${newCoverId}_${selectedCoverFile.name.split('.')[0]}`;
                localStorage.setItem(newCoverStorageKey, base64ImageData);
                finalAlbumCoverItem = { id: newCoverId, url: newCoverStorageKey, dateAdded: new Date().toISOString() };
                // Clean up old cover if it changed and existed AND the key is different
                if (imageInfo.albumCover?.url && imageInfo.albumCover.url !== newCoverStorageKey && imageInfo.albumCover.url !== albumCoverKey) {
                    localStorage.removeItem(imageInfo.albumCover.url);
                }
            } catch (error) { console.error("Error processing cover:", error); alert("Failed to process cover image."); return; }
        } else if (albumCoverKey && imageInfo.albumCover) {
            if (albumCoverKey !== imageInfo.albumCover.url) {
                finalAlbumCoverItem = { id: generatePanelUniqueId("imgItem_cover_manual_key"), url: albumCoverKey, dateAdded: new Date().toISOString() };
                if (imageInfo.albumCover.url) localStorage.removeItem(imageInfo.albumCover.url);
            } else {
                finalAlbumCoverItem = imageInfo.albumCover; // Key hasn't changed from original
            }
        } else if (albumCoverKey) { // New album, no imageInfo.albumCover, but a key was typed
            finalAlbumCoverItem = { id: generatePanelUniqueId("imgItem_cover_new_key"), url: albumCoverKey, dateAdded: new Date().toISOString() };
        }
        else { // No new file and no existing/typed valid cover key
            alert("Album cover image is required."); return;
        }

        const updatedAlbumDetails: ImageInfo = {
            ...imageInfo,
            title: albumTitle,
            description: albumDescription,
            albumCover: finalAlbumCoverItem,
            images: [...editableAlbumImages], // Pass a new array reference of the current state
            dateCreated: imageInfo.id === "NEW_IMAGE_TEMP_ID" ? (albumDate || new Date().toISOString().split('T')[0]) : imageInfo.dateCreated,
            lastUpdated: new Date().toISOString(),
        };

        onSave(updatedAlbumDetails); // Send to GalleryPage

        setSelectedCoverFile(null);
        if (coverFileInputRef.current) coverFileInputRef.current.value = "";

        if (imageInfo.id !== "NEW_IMAGE_TEMP_ID") {
        }
    };

    const handlePickLocationFromMapClick = () => { /* ... (same) ... */
        onStartPickLocation({ title: albumTitle, description: albumDescription, albumCoverUrl: albumCoverKey, albumDate: albumDate, });
    };
    const handleDeleteInitiate = () => setShowDeleteConfirm(true);
    const handleConfirmDelete = () => { /* ... (same - GalleryPage handles actual LS deletion) ... */
        if (imageInfo) { onDelete(imageInfo.id); setShowDeleteConfirm(false); onClose(); }
    };
    const handleCancelDelete = () => setShowDeleteConfirm(false);

    // --- Display values (remain mostly same) ---
    const displayTitle = imageInfo?.title || (imageInfo?.id === "NEW_IMAGE_TEMP_ID" ? "New Album" : "Untitled Album");
    const displayDesc = imageInfo?.description || '';
    const displayDateCreated = imageInfo?.dateCreated ? new Date(imageInfo.dateCreated).toLocaleDateString() : 'N/A';
    const displayDateLastUpdated = imageInfo?.lastUpdated ? new Date(imageInfo.lastUpdated).toLocaleDateString() : 'N/A';
    const currentLatDisplay = (imageInfo?.lat === 0 && imageInfo?.lng === 0 && imageInfo.id === "NEW_IMAGE_TEMP_ID") ? "Pick Location" : imageInfo?.lat?.toFixed(4) || "N/A";
    const currentLngDisplay = (imageInfo?.lat === 0 && imageInfo?.lng === 0 && imageInfo.id === "NEW_IMAGE_TEMP_ID") ? "" : imageInfo?.lng?.toFixed(4) || "N/A";

    // --- JSX (remains structurally same as your last provided code) ---
    return (
        <div className={`slide-panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className={`slide-panel ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose} aria-label="Close panel">&times;</button>

                <div className="panel-content">
                    {/* DISPLAY DETAILS VIEW */}
                    {panelView === 'displayDetails' && imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID" && (
                        <div className="panel-display-mode">
                            {/* Cover, Title, Desc, Dates, Location */}
                            <div className="image-container"> <img src={displayModeCoverSrc || PLACEHOLDER_IMAGE_URL} alt={displayTitle} className="panel-image-large" onError={(e) => { if ((e.currentTarget as HTMLImageElement).src !== PLACEHOLDER_IMAGE_URL) (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL; }} /> </div>
                            <h1>{displayTitle}</h1> {displayDesc && <p className="description-text">{displayDesc}</p>}
                            <div className="details-group"> <p><strong>Date Created:</strong> {displayDateCreated}</p> <p><strong>Last Updated:</strong> {displayDateLastUpdated}</p> {imageInfo.country && <p><strong>Country:</strong> {imageInfo.country}</p>} </div>

                            {/* External Images Snapshot */}
                            <div className="album-external-images-section">
                                <>{imageInfo.images.slice(0, MAX_PREVIEW_IMAGES_IN_DETAILS).map(imgItem => (
                                    <div key={imgItem.id} className="external-image-item-wrapper">
                                        <img src={internalImagesDisplaySrcMap[imgItem.id] || THUMBNAIL_PLACEHOLDER_URL} alt={`Album image ${imgItem.id.slice(-6)}`} className="internal-image-thumbnail" onError={(e) => { if ((e.currentTarget as HTMLImageElement).src !== THUMBNAIL_PLACEHOLDER_URL) (e.currentTarget as HTMLImageElement).src = THUMBNAIL_PLACEHOLDER_URL; }} />
                                    </div>
                                ))}</>
                                <div className="external-image-item-wrapper" onClick={() => switchPanelView('manageImages')}>
                                    <span>{imageInfo.images.length > 0 ? "View All" : "Add Images"}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EDIT ALBUM DETAILS VIEW */}
                    {panelView === 'editDetails' && imageInfo && (
                        <div className="panel-edit-mode">
                            <div className="form-group form-image-preview-container"> <img src={editModePreviewSrc || PLACEHOLDER_IMAGE_URL} alt="Album Cover Preview" className="form-image-preview" onError={(e) => { if ((e.currentTarget as HTMLImageElement).src !== PLACEHOLDER_IMAGE_URL) (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL; }} /> </div>
                            <h4>{imageInfo.id === "NEW_IMAGE_TEMP_ID" ? "Create New Album" : "Edit Album Details"}</h4>
                            <form onSubmit={handleSubmitAlbumDetails}>
                                <div className="form-group"> <label htmlFor="albumCoverFile">Album Cover Image:</label> <input type="file" id="albumCoverFile" accept="image/*" onChange={handleCoverFileChange} ref={coverFileInputRef} /> {selectedCoverFile && <small>Selected: {selectedCoverFile.name}</small>} </div>
                                <div className="form-group"><label htmlFor="albumTitle">Album Title:</label><input type="text" id="albumTitle" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} maxLength={50} required /></div>
                                <div className="form-group"><label htmlFor="albumDescription">Album Description:</label><textarea id="albumDescription" value={albumDescription} onChange={(e) => setAlbumDescription(e.target.value)} maxLength={300} rows={3} /></div>
                                <div className="form-group"><label>Location (Lat, Lon):</label><div className="location-input-group"><div className="coordinates-text"><span>Lat: {currentLatDisplay}</span>{currentLngDisplay && <span style={{ marginLeft: '10px' }}>Lon: {currentLngDisplay}</span>}</div><button type="button" onClick={handlePickLocationFromMapClick} className="pick-location-icon-btn" title="Pick location">📍</button></div></div>

                                <div className="panel-actions">
                                    <button type="submit" className="primary">{imageInfo.id === "NEW_IMAGE_TEMP_ID" ? "Create Album" : "Save Changes"}</button>
                                    <button type="button" onClick={handleCancelEditDetails} className="secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* MANAGE INTERNAL IMAGES VIEW */}
                    {panelView === 'manageImages' && imageInfo && (
                        <div className="panel-manage-images-mode">
                            <div className="manage-images-header">
                                <button onClick={() => switchPanelView(imageInfo.id === "NEW_IMAGE_TEMP_ID" ? 'editDetails' : 'displayDetails')} className="back-to-details-btn">
                                    <FaArrowLeft />
                                </button>
                                <h3>{albumTitle || (imageInfo.title || 'Album')}</h3>
                            </div>
                            {selectedImageIds.size > 0 ? (
                                <div className="add-images-custom-button">
                                    <button type="button" className="delete-trash-button-internal" onClick={handleDeleteSelectedImages} >
                                        <FaTrash />
                                        <p className='num-del'>{selectedImageIds.size}</p>
                                    </button>
                                </div>) : (
                                <div className="add-images-custom-button">
                                    {/* The label now becomes the styled button and contains the "+" icon */}
                                    <label
                                        htmlFor="addInternalImagesInput"
                                        title="Add New Images to Album"
                                    >
                                        <FaPlus />
                                    </label>

                                    {/* The actual file input is now hidden via CSS (or inline style) */}
                                    <input
                                        type="file"
                                        id="addInternalImagesInput"
                                        accept="image/*"
                                        multiple
                                        hidden
                                        onChange={handleAddInternalImages}
                                        ref={internalImageUploadRef}
                                        className="hidden-file-input" // Class to hide it
                                    />
                                </div>)}
                            <div className="edit-mode-internal-images">

                                <div className="internal-images-list">
                                    {editableAlbumImages.map(imgItem => (
                                        <div key={imgItem.id} className={`internal-image-item-wrapper editable ${selectedImageIds.has(imgItem.id) ? 'selected' : ''}`} onClick={() => handleToggleImageSelection(imgItem.id)} >
                                            <img src={internalImagesDisplaySrcMap[imgItem.id] || THUMBNAIL_PLACEHOLDER_URL} alt={`Image ${imgItem.id.slice(-6)}`} className="internal-image-thumbnail" onError={(e) => { if ((e.currentTarget as HTMLImageElement).src !== THUMBNAIL_PLACEHOLDER_URL) (e.currentTarget as HTMLImageElement).src = THUMBNAIL_PLACEHOLDER_URL; }} />
                                            {selectedImageIds.has(imgItem.id)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div> {/* End .panel-content */}

                {/* FABs for Edit/Delete Album - shown only in displayDetails view for an existing album */}
                {panelView === 'displayDetails' && imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID" && (
                    <>
                        <button type="button" onClick={() => handleDeleteInitiate()} className="delete-trash-button" aria-label="Delete Album" title="Delete Album"> <FaTrash /> </button>
                        <button type="button" onClick={switchToEditDetails} className="edit-pencil-button" aria-label="Edit Album Details" title="Edit Album Details"> <FaEdit /> </button>
                    </>
                )}

                {showDeleteConfirm && ( /* ... (delete confirmation dialog) ... */
                    <div className="confirm-delete-overlay">
                        <div className="confirm-delete-dialog">
                            <p>Delete album "{imageInfo?.title}"? This will also delete its cover and all internal images from storage.</p>
                            <div className="confirm-delete-actions"> <button onClick={handleConfirmDelete} className="button-danger">Yes, Delete</button> <button onClick={handleCancelDelete} className="button-secondary">Cancel</button> </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}