export interface ImageMetadata {
    id: number;
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    width: number | null;
    height: number | null;
    is_public: boolean;
    created_at: string;
    url: string;
}

export interface ImageListResponse {
    status: string;
    images: ImageMetadata[];
    count: number;
}