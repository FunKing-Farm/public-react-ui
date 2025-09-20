import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface SecureImageProps {
    imageId: number;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
}

const SecureImage: React.FC<SecureImageProps> = ({
    imageId,
    alt = 'Secure image',
    className = '',
    style = {}
}) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadImage = async (): Promise<void> => {
            try {
                setLoading(true);
                setError(null);

                const response = await apiService.getImage(imageId);

                if (response.success && response.data) {
                    const imageUrl = URL.createObjectURL(response.data);
                    setImageSrc(imageUrl);
                } else {
                    setError(response.error || 'Failed to load image');
                }
            } catch (err) {
                setError('Failed to load image');
                console.error('Image loading error:', err);
            } finally {
                setLoading(false);
            }
        };

        if (imageId) {
            loadImage();
        }

        // Cleanup object URL
        return () => {
            if (imageSrc) {
                URL.revokeObjectURL(imageSrc);
            }
        };
    }, [imageId]);

    if (loading) {
        return <div className="image-loading">Loading image...</div>;
    }

    if (error) {
        return <div className="image-error">Error: {error}</div>;
    }

    if (!imageSrc) {
        return null;
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            className={className}
            style={style}
        />
    );
};

export default SecureImage;