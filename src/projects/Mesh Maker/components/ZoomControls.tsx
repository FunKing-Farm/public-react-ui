// components/ZoomControls.tsx
import React from 'react';
import { type CanvasHandle } from '../Canvas';

interface ZoomControlsProps {
    canvasRef: React.RefObject<CanvasHandle>;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ canvasRef }) => {
    const [zoom, setZoom] = React.useState(100);

    React.useEffect(() => {
        const interval = setInterval(() => {
            const viewport = canvasRef.current?.getViewport();
            if (viewport) {
                setZoom(Math.round(viewport.zoom * 100));
            }
        }, 100);

        return () => clearInterval(interval);
    }, [canvasRef]);

    return (
        <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-lg">
            <div className="flex gap-2">
                <button
                    onClick={() => canvasRef.current?.zoomIn()}
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                    +
                </button>
                <span className="px-2 py-1 text-sm">
                    {zoom}%
                </span>
                <button
                    onClick={() => canvasRef.current?.zoomOut()}
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                    -
                </button>
                <button
                    onClick={() => canvasRef.current?.resetViewport()}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};