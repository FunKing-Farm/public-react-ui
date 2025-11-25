import React, { useRef, useState, useEffect } from 'react';
import WebGPUCanvas, { type WebGPUCanvasRef } from '../components/WebGPUCanvas';
import { type MeshData } from '../webgpu/types';
import { getRenderer } from '../webgpu/renderer';
import { type MeshDefinition } from '../webgpu/meshDefinition';
import { type MeshInstance } from '../webgpu/meshInstance';

const HomePage: React.FC = () => {
    const canvasRef = useRef<WebGPUCanvasRef>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [loadedDefinitions, setLoadedDefinitions] = useState<MeshDefinition[]>([]);
    const [selectedDefinition, setSelectedDefinition] = useState<MeshDefinition | null>(null);
    const [instances, setInstances] = useState<MeshInstance[]>([]);
    const [selectedInstance, setSelectedInstance] = useState<MeshInstance | null>(null);
    
    // Camera state for UI display
    const [cameraInfo, setCameraInfo] = useState({ x: 0, y: 0, zoom: 1.0 });
    
    // Update camera info periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const renderer = getRenderer();
            if (renderer) {
                const pos = renderer.camera.getPosition();
                const zoom = renderer.camera.getZoom();
                setCameraInfo({ x: pos[0], y: pos[1], zoom });
            }
        }, 100);
        
        return () => clearInterval(interval);
    }, []);

    const refreshInstances = () => {
        const renderer = getRenderer();
        if (renderer) {
            setInstances([...renderer.instanceManager.getAll()]);
        }
    };

    const handleLoad = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const meshData: MeshData = JSON.parse(text);
            
            const renderer = getRenderer();
            if (renderer) {
                const definition = renderer.loadMeshDefinition(meshData, file.name);
                setLoadedDefinitions([...renderer.definitionRegistry.getAll()]);
                setSelectedDefinition(definition);
                console.log('Loaded mesh definition:', definition.name);
            }
        } catch (error) {
            console.error('Failed to load mesh data:', error);
            alert('Failed to load mesh data. Please ensure the file is a valid JSON format.');
        }
    };

    const handleSpawnInstance = () => {
        if (!selectedDefinition) {
            alert('Please load a mesh definition first');
            return;
        }
        
        const renderer = getRenderer();
        if (!renderer) return;
        
        // Spawn at camera center with some randomness
        const cameraPos = renderer.camera.getPosition();
        const spread = 2.0 / renderer.camera.getZoom(); // Spread scales with zoom
        const x = cameraPos[0] + (Math.random() - 0.5) * spread;
        const y = cameraPos[1] + (Math.random() - 0.5) * spread;
        
        const instance = renderer.instanceManager.createInstance(
            selectedDefinition,
            `${selectedDefinition.name}_${Date.now()}`,
            { position: [x, y], scale: [0.3, 0.3] }
        );
        
        console.log('Spawned instance:', instance.name, `at position [${x.toFixed(2)}, ${y.toFixed(2)}]`);
        refreshInstances();
        setSelectedInstance(instance);
    };
    
    const handleSpawnGrid = () => {
        if (!selectedDefinition) {
            alert('Please load a mesh definition first');
            return;
        }
        
        const renderer = getRenderer();
        if (!renderer) return;
        
        const cameraPos = renderer.camera.getPosition();
        const spacing = 1.5;
        const gridSize = 3;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const x = cameraPos[0] + (i - gridSize / 2 + 0.5) * spacing;
                const y = cameraPos[1] + (j - gridSize / 2 + 0.5) * spacing;
                
                renderer.instanceManager.createInstance(
                    selectedDefinition,
                    `${selectedDefinition.name}_grid_${i}_${j}`,
                    { position: [x, y], scale: [0.3, 0.3] }
                );
            }
        }
        
        console.log(`Spawned ${gridSize * gridSize} instances in grid`);
        refreshInstances();
    };

    const handleDeleteInstance = (instanceId: string) => {
        const renderer = getRenderer();
        if (!renderer) return;
        
        renderer.instanceManager.removeInstance(instanceId);
        renderer.invalidateInstanceCache(instanceId);
        
        if (selectedInstance?.id === instanceId) {
            setSelectedInstance(null);
        }
        
        refreshInstances();
    };
    
    const handleClearAll = () => {
        const renderer = getRenderer();
        if (!renderer) return;
        
        const allInstances = renderer.instanceManager.getAll();
        allInstances.forEach(instance => {
            renderer.instanceManager.removeInstance(instance.id);
            renderer.invalidateInstanceCache(instance.id);
        });
        
        setSelectedInstance(null);
        refreshInstances();
    };

    const handleInstanceFrameChange = (instance: MeshInstance, frameIndex: number) => {
        const renderer = getRenderer();
        if (!renderer) return;
        
        instance.setFrameByIndex(frameIndex);
        renderer.invalidateInstanceCache(instance.id);
        refreshInstances();
    };

    const handleInstanceColorChange = (instance: MeshInstance, color: string) => {
        const r = parseInt(color.slice(1, 3), 16) / 255;
        const g = parseInt(color.slice(3, 5), 16) / 255;
        const b = parseInt(color.slice(5, 7), 16) / 255;
        
        instance.setColorTint(r, g, b);
        refreshInstances();
    };

    const handlePositionChange = (instance: MeshInstance, axis: 'x' | 'y', value: number) => {
        const pos = instance.getPosition();
        if (axis === 'x') {
            instance.setPosition(value, pos[1]);
        } else {
            instance.setPosition(pos[0], value);
        }
        refreshInstances();
    };

    const handleScaleChange = (instance: MeshInstance, axis: 'x' | 'y', value: number) => {
        const scale = instance.getScale();
        if (axis === 'x') {
            instance.setScale(value, scale[1]);
        } else {
            instance.setScale(scale[0], value);
        }
        refreshInstances();
    };

    const handleRotationChange = (instance: MeshInstance, degrees: number) => {
        const radians = (degrees * Math.PI) / 180;
        instance.setRotation(radians);
        refreshInstances();
    };
    
    const handleResetCamera = () => {
        const renderer = getRenderer();
        if (renderer) {
            renderer.camera.reset();
        }
    };
    
    const handleFocusInstance = (instance: MeshInstance) => {
        const renderer = getRenderer();
        if (!renderer) return;
        
        const pos = instance.getPosition();
        renderer.camera.setPosition(pos[0], pos[1]);
        setSelectedInstance(instance);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-xl font-bold text-gray-900">Mesh Instance Manager</h1>
                            <div className="text-sm text-gray-600 border-l pl-4 ml-4">
                                Camera: [{cameraInfo.x.toFixed(2)}, {cameraInfo.y.toFixed(2)}] | 
                                Zoom: {cameraInfo.zoom.toFixed(2)}x
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={handleLoad}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                            >
                                Load Mesh
                            </button>
                            <button 
                                onClick={handleSpawnInstance}
                                disabled={!selectedDefinition}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                            >
                                Spawn
                            </button>
                            <button 
                                onClick={handleSpawnGrid}
                                disabled={!selectedDefinition}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                            >
                                Spawn Grid (3×3)
                            </button>
                            <button 
                                onClick={handleClearAll}
                                disabled={instances.length === 0}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                            >
                                Clear All
                            </button>
                            <button 
                                onClick={handleResetCamera}
                                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
                            >
                                Reset Camera
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Sidebar - Definitions */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-lg shadow-lg p-4">
                            <h2 className="text-lg font-semibold mb-4">Loaded Definitions</h2>
                            <div className="space-y-2">
                                {loadedDefinitions.map(def => (
                                    <button
                                        key={def.id}
                                        onClick={() => setSelectedDefinition(def)}
                                        className={`w-full text-left px-3 py-2 rounded transition-colors ${
                                            selectedDefinition?.id === def.id
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 hover:bg-gray-200'
                                        }`}
                                    >
                                        <div className="font-medium truncate">{def.name}</div>
                                        <div className="text-xs opacity-75">
                                            {def.getFrameCount()} frames
                                        </div>
                                    </button>
                                ))}
                                {loadedDefinitions.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                        No definitions loaded
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-sm mb-2 text-blue-900">Controls</h3>
                            <ul className="text-xs text-blue-800 space-y-1">
                                <li>• Mouse wheel: Zoom</li>
                                <li>• Click + drag: Pan</li>
                                <li>• Scroll to zoom at cursor</li>
                            </ul>
                        </div>
                    </div>

                    {/* Center - Canvas */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-lg p-4">
                            <WebGPUCanvas ref={canvasRef} width={800} height={600} />
                            <div className="mt-4 text-center text-sm text-gray-600">
                                {instances.length} instance{instances.length !== 1 ? 's' : ''} in scene
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Instance List & Controls */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-lg p-4">
                            <h2 className="text-lg font-semibold mb-4">Active Instances</h2>
                            <div className="space-y-3 max-h-[700px] overflow-y-auto">
                                {instances.map(instance => (
                                    <div
                                        key={instance.id}
                                        className={`border rounded p-3 ${
                                            selectedInstance?.id === instance.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">
                                                    {instance.name}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                    {instance.definition.name}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    [{instance.getPosition()[0].toFixed(2)}, {instance.getPosition()[1].toFixed(2)}]
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteInstance(instance.id)}
                                                className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        
                                        <button
                                            onClick={() => handleFocusInstance(instance)}
                                            className="w-full text-xs bg-purple-100 hover:bg-purple-200 py-1 rounded mb-2"
                                        >
                                            Focus Camera
                                        </button>
                                        
                                        {/* Position Controls */}
                                        <div className="mt-2 space-y-1">
                                            <label className="text-xs text-gray-600 block">Position X:</label>
                                            <input
                                                type="range"
                                                min="-10"
                                                max="10"
                                                step="0.1"
                                                value={instance.getPosition()[0]}
                                                onChange={(e) => handlePositionChange(instance, 'x', parseFloat(e.target.value))}
                                                className="w-full"
                                            />
                                            <div className="text-xs text-gray-500 text-right">
                                                {instance.getPosition()[0].toFixed(2)}
                                            </div>
                                        </div>
                                        
                                        <div className="mt-2 space-y-1">
                                            <label className="text-xs text-gray-600 block">Position Y:</label>
                                            <input
                                                type="range"
                                                min="-10"
                                                max="10"
                                                step="0.1"
                                                value={instance.getPosition()[1]}
                                                onChange={(e) => handlePositionChange(instance, 'y', parseFloat(e.target.value))}
                                                className="w-full"
                                            />
                                            <div className="text-xs text-gray-500 text-right">
                                                {instance.getPosition()[1].toFixed(2)}
                                            </div>
                                        </div>
                                        
                                        {/* Scale Controls */}
                                        <div className="mt-2 space-y-1">
                                            <label className="text-xs text-gray-600 block">Scale:</label>
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="2"
                                                step="0.1"
                                                value={instance.getScale()[0]}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    handleScaleChange(instance, 'x', val);
                                                    handleScaleChange(instance, 'y', val);
                                                }}
                                                className="w-full"
                                            />
                                            <div className="text-xs text-gray-500 text-right">
                                                {instance.getScale()[0].toFixed(1)}
                                            </div>
                                        </div>
                                        
                                        {/* Rotation Control */}
                                        <div className="mt-2 space-y-1">
                                            <label className="text-xs text-gray-600 block">Rotation:</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                step="15"
                                                value={(instance.getRotation() * 180 / Math.PI) % 360}
                                                onChange={(e) => handleRotationChange(instance, parseFloat(e.target.value))}
                                                className="w-full"
                                            />
                                            <div className="text-xs text-gray-500 text-right">
                                                {((instance.getRotation() * 180 / Math.PI) % 360).toFixed(0)}°
                                            </div>
                                        </div>
                                        
                                        {/* Frame selector */}
                                        {instance.definition.getFrameCount() > 0 && (
                                            <div className="mt-2">
                                                <label className="text-xs text-gray-600 block mb-1">
                                                    State:
                                                </label>
                                                <select
                                                    value={instance.getCurrentFrameIndex()}
                                                    onChange={(e) => handleInstanceFrameChange(
                                                        instance,
                                                        parseInt(e.target.value)
                                                    )}
                                                    className="w-full text-xs border rounded px-2 py-1"
                                                >
                                                    {instance.definition.getFrameNames().map((name, idx) => (
                                                        <option key={idx} value={idx}>
                                                            {name || `Frame ${idx}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        
                                        {/* Color tint */}
                                        <div className="mt-2">
                                            <label className="text-xs text-gray-600 block mb-1">
                                                Tint:
                                            </label>
                                            <input
                                                type="color"
                                                onChange={(e) => handleInstanceColorChange(instance, e.target.value)}
                                                className="w-full h-8 rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                ))}
                                {instances.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                        No instances spawned
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HomePage;