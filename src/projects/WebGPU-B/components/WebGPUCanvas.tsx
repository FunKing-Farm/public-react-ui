import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { initWebGPU, getRenderer } from '../webgpu/renderer';
import { type MeshData } from '../webgpu/types';

interface WebGPUCanvasProps {
    width: number;
    height: number;
    meshData?: MeshData;
}

export interface WebGPUCanvasRef {
    loadMeshData: (data: MeshData) => void;
}

const WebGPUCanvas = forwardRef<WebGPUCanvasRef, WebGPUCanvasProps>(
    ({ width, height, meshData }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const cleanupRef = useRef<(() => void) | null>(null);

        useImperativeHandle(ref, () => ({
            loadMeshData: (data: MeshData) => {
                const renderer = getRenderer();
                if (renderer) {
                    // Load as definition and create default instance
                    const definition = renderer.loadMeshDefinition(data, 'loaded_mesh');
                    renderer.instanceManager.createInstance(definition, 'default_instance', {
                        position: [0, 0],
                        scale: [1, 1],
                        rotation: 0
                    });
                }
            }
        }));

        useEffect(() => {
            if (!canvasRef.current) return;

            const setup = async () => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                try {
                    cleanupRef.current = await initWebGPU(canvas);
                    
                    // Load initial mesh data if provided
                    if (meshData) {
                        const renderer = getRenderer();
                        if (renderer) {
                            const definition = renderer.loadMeshDefinition(meshData, 'initial_mesh');
                            renderer.instanceManager.createInstance(definition, 'default_instance', {
                                position: [0, 0],
                                scale: [1, 1],
                                rotation: 0
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to initialize WebGPU:', error);
                }
            };

            setup();

            return () => {
                if (cleanupRef.current) {
                    cleanupRef.current();
                    cleanupRef.current = null;
                }
            };
        }, []);

        useEffect(() => {
            if (meshData) {
                const renderer = getRenderer();
                if (renderer) {
                    const definition = renderer.loadMeshDefinition(meshData, 'loaded_mesh');
                    renderer.instanceManager.createInstance(definition, 'default_instance', {
                        position: [0, 0],
                        scale: [1, 1],
                        rotation: 0
                    });
                }
            }
        }, [meshData]);

        return (
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="border border-gray-300"
                style={{ width: `${width}px`, height: `${height}px` }}
            />
        );
    }
);

WebGPUCanvas.displayName = 'WebGPUCanvas';

export default WebGPUCanvas;