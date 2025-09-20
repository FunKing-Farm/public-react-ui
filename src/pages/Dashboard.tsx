import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import type { ImageMetadata } from '@/types/image';
import SecureImage from '@/components/images/SecureImage';
import Layout from '@/components/layout/Layout';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [images, setImages] = useState<ImageMetadata[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadImages = async (): Promise<void> => {
            try {
                setLoading(true);
                const response = await apiService.getImageList();

                if (response.success && response.data) {
                    setImages(response.data.images);
                } else {
                    setError(response.error || 'Failed to load images');
                }
            } catch (err) {
                setError('Failed to load images');
                console.error('Error loading images:', err);
            } finally {
                setLoading(false);
            }
        };

        loadImages();
    }, []);

    return (
        <Layout>
            <div className="dashboard">
                <h2>Dashboard</h2>
                {user && (
                    <div className="user-welcome">
                        <p>Welcome back, {user.username}!</p>
                        <p>Email: {user.email}</p>
                    </div>
                )}

                <div className="images-section">
                    <h3>Your Images</h3>
                    {loading && <p>Loading images...</p>}
                    {error && <p className="error-message">Error: {error}</p>}
                    {!loading && !error && images.length === 0 && (
                        <p>No images found. Upload some images to get started!</p>
                    )}
                    {!loading && !error && images.length > 0 && (
                        <div className="image-grid">
                            {images.map((image) => (
                                <div key={image.id} className="image-card">
                                    <SecureImage
                                        imageId={image.id}
                                        alt={image.original_filename}
                                        className="thumbnail"
                                    />
                                    <div className="image-info">
                                        <p className="filename">{image.original_filename}</p>
                                        <p className="file-size">
                                            {(image.file_size / 1024).toFixed(1)} KB
                                        </p>
                                        {image.width && image.height && (
                                            <p className="dimensions">
                                                {image.width} × {image.height}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;