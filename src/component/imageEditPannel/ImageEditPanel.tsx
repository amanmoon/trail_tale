import React, { useState, useEffect, useRef } from 'react';
import { FaEdit, FaTrash, FaArrowLeft, FaPlus, FaImage } from 'react-icons/fa';
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

const THUMBNAIL_PLACEHOLDER_URL = 'https://via.placeholder.com/100x100?text=N/A';
const MAX_PREVIEW_IMAGES_IN_DETAILS = 3;

type PanelView = 'displayDetails' | 'editDetails' | 'manageImages';

export function ImageEditPanel({
    imageInfo, 
    onSave,    
    onClose,   
    isOpen,
    onStartPickLocation,
    onDelete,
}: ImageEditPanelProps) {
    const [panelView, setPanelView] = useState<PanelView>('displayDetails');

    const [albumTitle, setAlbumTitle] = useState('');
    const [albumDescription, setAlbumDescription] = useState('');
    const [albumCoverKey, setAlbumCoverKey] = useState('');
    const [albumDate, setAlbumDate] = useState('');
    const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
    const [coverFilePreview, setCoverFilePreview] = useState<string | null>(null);

    const [displayModeCoverSrc, setDisplayModeCoverSrc] = useState<string | null>(null);
    const [editModePreviewSrc, setEditModePreviewSrc] = useState<string | null>(null);

    const [editableAlbumImages, setEditableAlbumImages] = useState<ImageItem[]>([]);
    const [internalImagesDisplaySrcMap, setInternalImagesDisplaySrcMap] = useState<Record<string, string | null>>({});
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

    const currentlyViewedAlbumIdRef = useRef<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const internalImageUploadRef = useRef<HTMLInputElement>(null);


    const switchPanelView = (newView: PanelView) => {
        setSelectedImageIds(new Set());
        setPanelView(newView);
    };

    useEffect(() => {
        if (isOpen) {
            const currentAlbumProp = imageInfo; 
            if (currentAlbumProp) {
                if (currentlyViewedAlbumIdRef.current !== currentAlbumProp.id) {
                    console.log("ImageEditPanel: Initializing for new/different album:", currentAlbumProp.id);
                    setAlbumTitle(currentAlbumProp.title || '');
                    setAlbumDescription(currentAlbumProp.description || '');
                    const coverKeyFromProp = currentAlbumProp.albumCover?.url || '';
                    setAlbumCoverKey(coverKeyFromProp);
                    setAlbumDate(currentAlbumProp.dateCreated || (currentAlbumProp.id === "NEW_IMAGE_TEMP_ID" ? new Date().toISOString().split('T')[0] : ''));

                    setSelectedCoverFile(null); 
                    setEditableAlbumImages(currentAlbumProp.images ? [...currentAlbumProp.images] : []);
                    setSelectedImageIds(new Set()); 

                    if (coverKeyFromProp) {
                        const base64Data = localStorage.getItem(coverKeyFromProp);
                        setDisplayModeCoverSrc(base64Data || null);
                        setEditModePreviewSrc(base64Data || null);
                    } else {
                        setDisplayModeCoverSrc(null);
                        setEditModePreviewSrc(null);
                    }

                    if (currentAlbumProp.id === "NEW_IMAGE_TEMP_ID") {
                        setPanelView('editDetails'); 
                    } else {
                        setPanelView('displayDetails'); 
                    }
                    currentlyViewedAlbumIdRef.current = currentAlbumProp.id; 
                }
            }
        } else { 
            setPanelView('displayDetails');
            setAlbumTitle(''); setAlbumDescription(''); setAlbumCoverKey(''); setAlbumDate('');
            setSelectedCoverFile(null); setCoverFilePreview(null);
            setDisplayModeCoverSrc(null); setEditModePreviewSrc(null);
            setEditableAlbumImages([]); setInternalImagesDisplaySrcMap({}); setSelectedImageIds(new Set());
            currentlyViewedAlbumIdRef.current = null; 
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

    useEffect(() => { 
        if (selectedCoverFile) {
            const objectUrl = URL.createObjectURL(selectedCoverFile);
            setCoverFilePreview(objectUrl);
            setEditModePreviewSrc(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            if (albumCoverKey) { 
                setEditModePreviewSrc(localStorage.getItem(albumCoverKey) || null);
            } else {
                setEditModePreviewSrc(null);
            }
            setCoverFilePreview(null);
        }
    }, [selectedCoverFile, albumCoverKey]);

    useEffect(() => {
        if (isOpen && imageInfo) { 
            const imageListToFetch = (panelView === 'manageImages')
                ? editableAlbumImages 
                : imageInfo.images || []; 

            const sources: Record<string, string | null> = {};
            imageListToFetch.forEach(imgItem => {
                if (imgItem.url) { 
                    sources[imgItem.id] = localStorage.getItem(imgItem.url) || null;
                } else {
                    sources[imgItem.id] = null;
                }
            });
            setInternalImagesDisplaySrcMap(sources);
        }
    }, [isOpen, panelView, imageInfo, editableAlbumImages]); 


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
            setEditableAlbumImages(imageInfo.images ? [...imageInfo.images] : []); 
        } else {
            onClose(); 
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
            ...imageInfo, 
            title: albumTitle,
            description: albumDescription,
            albumCover: imageInfo.albumCover,
            images: resolvedNewImageItems, 
            dateCreated: imageInfo.id === "NEW_IMAGE_TEMP_ID"
                ? (albumDate || new Date().toISOString().split('T')[0])
                : imageInfo.dateCreated,
            lastUpdated: new Date().toISOString(),
        };

        onSave(updatedAlbumDetails); 
    };

    const handleToggleImageSelection = (imageId: string) => { 
        setSelectedImageIds(prevSelected => { const newSelected = new Set(prevSelected); if (newSelected.has(imageId)) { newSelected.delete(imageId); } else { newSelected.add(imageId); } return newSelected; });
    };

    const handleDeleteSelectedImages = () => { 
        if (selectedImageIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedImageIds.size} selected image(s)? This action is permanent.`)) return;
        const imagesToKeep: ImageItem[] = []; const urlsToDeleteFromStorage: string[] = [];
        editableAlbumImages.forEach(imgItem => { if (selectedImageIds.has(imgItem.id)) { if (imgItem.url) { urlsToDeleteFromStorage.push(imgItem.url); } } else { imagesToKeep.push(imgItem); } });
        urlsToDeleteFromStorage.forEach(url => localStorage.removeItem(url));

        setEditableAlbumImages(imagesToKeep); setSelectedImageIds(new Set());

        const updatedAlbumDetails: ImageInfo = {
            ...imageInfo, 
            title: albumTitle,
            description: albumDescription,
            albumCover: imageInfo.albumCover,
            images: imagesToKeep, 
            dateCreated: imageInfo.id === "NEW_IMAGE_TEMP_ID"
                ? (albumDate || new Date().toISOString().split('T')[0])
                : imageInfo.dateCreated,
            lastUpdated: new Date().toISOString(),
        };

        onSave(updatedAlbumDetails); 
    };

    const handleSubmitAlbumDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageInfo) return;
        let finalAlbumCoverItem: ImageItem;
        if (selectedCoverFile) {
            try {
                const base64ImageData = await convertFileToBase64(selectedCoverFile);
                const newCoverId = generatePanelUniqueId("imgItem_cover");
                const newCoverStorageKey = `img_data_cover_${newCoverId}_${selectedCoverFile.name.split('.')[0]}`;
                localStorage.setItem(newCoverStorageKey, base64ImageData);
                finalAlbumCoverItem = { id: newCoverId, url: newCoverStorageKey, dateAdded: new Date().toISOString() };
                if (imageInfo.albumCover?.url && imageInfo.albumCover.url !== newCoverStorageKey && imageInfo.albumCover.url !== albumCoverKey) {
                    localStorage.removeItem(imageInfo.albumCover.url);
                }
            } catch (error) { console.error("Error processing cover:", error); alert("Failed to process cover image."); return; }
        } else if (albumCoverKey && imageInfo.albumCover) {
            if (albumCoverKey !== imageInfo.albumCover.url) {
                finalAlbumCoverItem = { id: generatePanelUniqueId("imgItem_cover_manual_key"), url: albumCoverKey, dateAdded: new Date().toISOString() };
                if (imageInfo.albumCover.url) localStorage.removeItem(imageInfo.albumCover.url);
            } else {
                finalAlbumCoverItem = imageInfo.albumCover; 
            }
        } else if (albumCoverKey) { 
            finalAlbumCoverItem = { id: generatePanelUniqueId("imgItem_cover_new_key"), url: albumCoverKey, dateAdded: new Date().toISOString() };
        }
        else { 
            alert("Album cover image is required."); return;
        }

        const updatedAlbumDetails: ImageInfo = {
            ...imageInfo,
            title: albumTitle,
            description: albumDescription,
            albumCover: finalAlbumCoverItem,
            images: [...editableAlbumImages], 
            dateCreated: imageInfo.id === "NEW_IMAGE_TEMP_ID" ? (albumDate || new Date().toISOString().split('T')[0]) : imageInfo.dateCreated,
            lastUpdated: new Date().toISOString(),
        };

        onSave(updatedAlbumDetails); 

        setSelectedCoverFile(null);
        if (coverFileInputRef.current) coverFileInputRef.current.value = "";

        if (imageInfo.id !== "NEW_IMAGE_TEMP_ID") {
        }
    };

    const handlePickLocationFromMapClick = async () => {
        let currentCoverKeyRef = albumCoverKey;
        if (selectedCoverFile) {
            try {
                const base64ImageData = await convertFileToBase64(selectedCoverFile);
                currentCoverKeyRef = generatePanelUniqueId("imgItem_cover_temp");
                localStorage.setItem(currentCoverKeyRef, base64ImageData);
                setAlbumCoverKey(currentCoverKeyRef);
            } catch (error) {
                console.error("Error processing cover for map pick:", error);
            }
        }
        onStartPickLocation({ title: albumTitle, description: albumDescription, albumCoverUrl: currentCoverKeyRef, albumDate: albumDate });
    };
    const handleDeleteInitiate = () => setShowDeleteConfirm(true);
    const handleConfirmDelete = () => { 
        if (imageInfo) { onDelete(imageInfo.id); setShowDeleteConfirm(false); onClose(); }
    };
    const handleCancelDelete = () => setShowDeleteConfirm(false);

    const displayTitle = imageInfo?.title || (imageInfo?.id === "NEW_IMAGE_TEMP_ID" ? "New Album" : "Untitled Album");
    const displayDesc = imageInfo?.description || '';
    const displayDateCreated = imageInfo?.dateCreated ? new Date(imageInfo.dateCreated).toLocaleDateString() : 'N/A';
    const displayDateLastUpdated = imageInfo?.lastUpdated ? new Date(imageInfo.lastUpdated).toLocaleDateString() : 'N/A';
    const currentLatDisplay = (imageInfo?.lat === 0 && imageInfo?.lng === 0 && imageInfo.id === "NEW_IMAGE_TEMP_ID") ? "Pick Location" : imageInfo?.lat?.toFixed(4) || "N/A";
    const currentLngDisplay = (imageInfo?.lat === 0 && imageInfo?.lng === 0 && imageInfo.id === "NEW_IMAGE_TEMP_ID") ? "" : imageInfo?.lng?.toFixed(4) || "N/A";

    return (
        <div className={`slide-panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className={`slide-panel ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose} aria-label="Close panel">&times;</button>

                <div className="panel-content">
                    {panelView === 'displayDetails' && imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID" && (
                        <div className="panel-display-mode">
                            <div className="image-container">
                                {displayModeCoverSrc ? (
                                    <img src={displayModeCoverSrc} alt={displayTitle} className="panel-image-large" />
                                ) : (
                                    <div className="panel-image-large empty-cover-preview">
                                        <FaImage className="empty-cover-icon" />
                                        <span>No Cover Image</span>
                                    </div>
                                )}
                            </div>
                            <h1>{displayTitle}</h1> {displayDesc && <p className="description-text">{displayDesc}</p>}
                            <div className="details-group"> <p><strong>Date Created:</strong> {displayDateCreated}</p> <p><strong>Last Updated:</strong> {displayDateLastUpdated}</p> {imageInfo.country && <p><strong>Country:</strong> {imageInfo.country}</p>} </div>

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

                    {panelView === 'editDetails' && imageInfo && (
                        <div className="panel-edit-mode">
                            <div className="form-group form-image-preview-container">
                                {editModePreviewSrc ? (
                                    <img src={editModePreviewSrc} alt="Album Cover Preview" className="form-image-preview" />
                                ) : (
                                    <div className="form-image-preview empty-cover-preview">
                                        <FaImage className="empty-cover-icon" />
                                        <span>No Cover Image Preview</span>
                                    </div>
                                )}
                            </div>
                            <h4>{imageInfo.id === "NEW_IMAGE_TEMP_ID" ? "Create New Album" : "Edit Album Details"}</h4>
                            <form onSubmit={handleSubmitAlbumDetails}>
                                <div className="form-group">
                                    <label>Album Cover Image:</label>
                                    <div>
                                        <label htmlFor="albumCoverFile" className="custom-file-upload-btn">
                                            <FaPlus /> Add photo
                                        </label>
                                        <input type="file" id="albumCoverFile" accept="image/*" style={{ display: 'none' }} onChange={handleCoverFileChange} ref={coverFileInputRef} />
                                    </div>
                                    {selectedCoverFile && <small className="selected-file-name">Selected: {selectedCoverFile.name}</small>}
                                </div>
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
                                    <label
                                        htmlFor="addInternalImagesInput"
                                        title="Add New Images to Album"
                                    >
                                        <FaPlus />
                                    </label>

                                    <input
                                        type="file"
                                        id="addInternalImagesInput"
                                        accept="image/*"
                                        multiple
                                        hidden
                                        onChange={handleAddInternalImages}
                                        ref={internalImageUploadRef}
                                        className="hidden-file-input"
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
                </div> 

                {panelView === 'displayDetails' && imageInfo && imageInfo.id !== "NEW_IMAGE_TEMP_ID" && (
                    <div className="panel-actions">
                        <button type="button" onClick={() => handleDeleteInitiate()} className="delete-trash-button" aria-label="Delete Album" title="Delete Album"> <FaTrash /> </button>
                        <button type="button" onClick={switchToEditDetails} className="edit-pencil-button" aria-label="Edit Album Details" title="Edit Album Details"> <FaEdit /> </button>
                    </div>
                )}

                {showDeleteConfirm && (
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