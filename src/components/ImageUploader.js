// src/components/ImageUploader.js
import React, { useState } from 'react';

function ImageUploader({ onImageUpload }) {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const handleImageChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = () => {
        if (selectedImage) {
            onImageUpload(selectedImage);
            setSelectedImage(null);
            setImagePreview(null);
        }
    };

    return (
        <div>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
                <div>
                    <img src={imagePreview} alt="Bill Preview" style={{ maxWidth: '300px', maxHeight: '300px' }} />
                    <button onClick={handleSubmit}>Upload Bill</button>
                </div>
            )}
        </div>
    );
}

export default ImageUploader;