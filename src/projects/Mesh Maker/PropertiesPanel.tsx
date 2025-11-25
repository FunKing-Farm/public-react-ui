// PropertiesPanel.tsx
import React, { useMemo } from 'react';
import { type AppState, type AppAction, type Vertex, type Shape } from './types';

interface PropertiesPanelProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    showExportPreview: boolean;
    gridSize: number;
    mergeSelectedVertices: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    state, dispatch, showExportPreview, gridSize, mergeSelectedVertices
}) => {
    const selectedVertices = useMemo(() => {
        return Array.from(state.selectedVertexIds).map(id => state.vertices.get(id)).filter(Boolean) as Vertex[];
    }, [state.selectedVertexIds, state.vertices]);

    const selectedShapes = useMemo(() => {
        return Array.from(state.selectedShapeIds).map(id => state.shapes.get(id)).filter(Boolean) as Shape[];
    }, [state.selectedShapeIds, state.shapes]);

    return (
        <div className="w-80 bg-white p-4 shadow-lg overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Properties</h2>
            
            {showExportPreview && (() => {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                state.vertices.forEach(vertex => {
                    minX = Math.min(minX, vertex.x);
                    minY = Math.min(minY, vertex.y);
                    maxX = Math.max(maxX, vertex.x);
                    maxY = Math.max(maxY, vertex.y);
                });
                
                state.frames.forEach(frame => {
                    frame.vertices.forEach(pos => {
                        minX = Math.min(minX, pos.x);
                        minY = Math.min(minY, pos.y);
                        maxX = Math.max(maxX, pos.x);
                        maxY = Math.max(maxY, pos.y);
                    });
                });
                
                if (!isFinite(minX)) return null;
                
                const widthInGrid = Math.round(((maxX - minX) / gridSize) * 100) / 100;
                const heightInGrid = Math.round(((maxY - minY) / gridSize) * 100) / 100;
                
                return (
                    <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-300 rounded">
                        <h3 className="font-bold text-purple-900 mb-3">Export Preview</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Origin (0,0):</span>
                                <span className="font-mono">({Math.round(minX)}, {Math.round(minY)})px</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Dimensions (pixels):</span>
                                <span className="font-mono">
                                    {Math.round(maxX - minX)} × {Math.round(maxY - minY)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Dimensions (grid):</span>
                                <span className="font-mono font-bold text-purple-900">
                                    {widthInGrid} × {heightInGrid}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Grid Size:</span>
                                <span className="font-mono">{gridSize}px</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Vertices:</span>
                                <span className="font-mono">{state.vertices.size}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Frames:</span>
                                <span className="font-mono">{state.frames.length}</span>
                            </div>
                        </div>
                        <p className="text-xs text-purple-700 mt-3">
                            All coordinates will be exported in <strong>grid units</strong> relative to the origin point (purple dot).
                            <br/>
                            1 grid unit = {gridSize} pixels
                        </p>
                    </div>
                );
            })()}

            {selectedVertices.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-bold mb-3">
                        Vertices ({selectedVertices.length})
                    </h3>
                    
                    <div className="mb-3 p-3 bg-gray-50 rounded text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Anchor vertices:</span>
                            <span className="font-medium">
                                {selectedVertices.filter(v => v.type === "anchor").length}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Control vertices:</span>
                            <span className="font-medium">
                                {selectedVertices.filter(v => v.type === "control").length}
                            </span>
                        </div>
                        {selectedVertices.length > 1 && (() => {
                            const avgX = selectedVertices.reduce((sum, v) => sum + v.x, 0) / selectedVertices.length;
                            const avgY = selectedVertices.reduce((sum, v) => sum + v.y, 0) / selectedVertices.length;
                            return (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Center X:</span>
                                        <span className="font-medium">{Math.round(avgX)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Center Y:</span>
                                        <span className="font-medium">{Math.round(avgY)}</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedVertices.map((vertex, index) => (
                            <div key={vertex.id} className="p-3 border rounded">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-medium text-gray-500">
                                        Vertex {index + 1}
                                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                            vertex.type === "anchor" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                                        }`}>
                                            {vertex.type}
                                        </span>
                                    </span>
                                    <button
                                        onClick={() => {
                                            const newSelection = new Set(state.selectedVertexIds);
                                            newSelection.delete(vertex.id);
                                            dispatch({ 
                                                type: "SELECT_VERTICES", 
                                                ids: Array.from(newSelection) 
                                            });
                                        }}
                                        className="text-red-500 text-xs hover:text-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-600">X:</label>
                                        <input
                                            type="number"
                                            value={Math.round(vertex.x)}
                                            onChange={(e) => {
                                                dispatch({
                                                    type: "UPDATE_VERTEX",
                                                    id: vertex.id,
                                                    updates: { x: parseFloat(e.target.value) || 0 }
                                                });
                                            }}
                                            className="w-full border rounded px-2 py-1 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">Y:</label>
                                        <input
                                            type="number"
                                            value={Math.round(vertex.y)}
                                            onChange={(e) => {
                                                dispatch({
                                                    type: "UPDATE_VERTEX",
                                                    id: vertex.id,
                                                    updates: { y: parseFloat(e.target.value) || 0 }
                                                });
                                            }}
                                            className="w-full border rounded px-2 py-1 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                    ID: {vertex.id.slice(0, 8)}...
                                    {vertex.parentId && (
                                        <div>Parent: {vertex.parentId.slice(0, 8)}...</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {selectedVertices.length > 1 && (
                        <div className="mt-3 space-y-2">
                            <button
                                onClick={mergeSelectedVertices}
                                className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
                            >
                                Merge {selectedVertices.length} Vertices
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        const updates = selectedVertices.map(v => ({
                                            id: v.id,
                                            updates: { x: Math.round(v.x / gridSize) * gridSize }
                                        }));
                                        dispatch({ type: "BATCH_UPDATE", updates: { vertices: updates } });
                                    }}
                                    className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                                >
                                    Snap X
                                </button>
                                <button
                                    onClick={() => {
                                        const updates = selectedVertices.map(v => ({
                                            id: v.id,
                                            updates: { y: Math.round(v.y / gridSize) * gridSize }
                                        }));
                                        dispatch({ type: "BATCH_UPDATE", updates: { vertices: updates } });
                                    }}
                                    className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                                >
                                    Snap Y
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedShapes.length > 0 && (
                <div>
                    <h3 className="font-bold mb-3">
                        Shapes ({selectedShapes.length})
                    </h3>
                    <div className="space-y-3">
                        {selectedShapes.map((shape) => (
                            <div key={shape.id} className="p-3 border rounded">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-medium capitalize">
                                        {shape.type}
                                        <span className="ml-2 text-xs text-gray-500">
                                            ({shape.vertexIds.length} vertices)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            dispatch({ type: "DELETE_SHAPE", id: shape.id });
                                        }}
                                        className="text-red-500 text-xs hover:text-red-700"
                                    >
                                        Delete
                                    </button>
                                </div>
                                
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-gray-600">Stroke Color:</label>
                                        <input
                                            type="color"
                                            value={shape.style.color}
                                            onChange={(e) => {
                                                dispatch({
                                                    type: "UPDATE_SHAPE",
                                                    id: shape.id,
                                                    updates: {
                                                        style: { ...shape.style, color: e.target.value }
                                                    }
                                                });
                                            }}
                                            className="w-full h-8 border rounded"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs text-gray-600">
                                            Stroke Width: {shape.style.strokeWidth}px
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="20"
                                            value={shape.style.strokeWidth}
                                            onChange={(e) => {
                                                dispatch({
                                                    type: "UPDATE_SHAPE",
                                                    id: shape.id,
                                                    updates: {
                                                        style: { ...shape.style, strokeWidth: Number(e.target.value) }
                                                    }
                                                });
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs text-gray-600">Fill:</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={shape.style.fill || "#ffffff"}
                                                onChange={(e) => {
                                                    dispatch({
                                                        type: "UPDATE_SHAPE",
                                                        id: shape.id,
                                                        updates: {
                                                            style: { ...shape.style, fill: e.target.value }
                                                        }
                                                    });
                                                }}
                                                disabled={!shape.style.fill}
                                                className="flex-1 h-8 border rounded"
                                            />
                                            <button
                                                onClick={() => {
                                                    dispatch({
                                                        type: "UPDATE_SHAPE",
                                                        id: shape.id,
                                                        updates: {
                                                            style: { 
                                                                ...shape.style, 
                                                                fill: shape.style.fill ? "" : "#ffffff" 
                                                            }
                                                        }
                                                    });
                                                }}
                                                className={`px-3 py-1 rounded text-xs ${
                                                    shape.style.fill ? "bg-blue-500 text-white" : "bg-gray-200"
                                                }`}
                                            >
                                                {shape.style.fill ? "On" : "Off"}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs text-gray-600">
                                            Opacity: {Math.round((shape.style.opacity || 1) * 100)}%
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={shape.style.opacity || 1}
                                            onChange={(e) => {
                                                dispatch({
                                                    type: "UPDATE_SHAPE",
                                                    id: shape.id,
                                                    updates: {
                                                        style: { ...shape.style, opacity: Number(e.target.value) }
                                                    }
                                                });
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    
                                    {shape.type === "circle" && (
                                        <div>
                                            <label className="text-xs text-gray-600">Radius:</label>
                                            <input
                                                type="number"
                                                value={Math.round(shape.radius)}
                                                onChange={(e) => {
                                                    dispatch({
                                                        type: "UPDATE_SHAPE",
                                                        id: shape.id,
                                                        updates: { radius: parseFloat(e.target.value) || 10 }
                                                    });
                                                }}
                                                className="w-full border rounded px-2 py-1 text-sm"
                                            />
                                        </div>
                                    )}
                                    
                                    <label className="flex items-center space-x-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={shape.visible}
                                            onChange={(e) => {
                                                dispatch({
                                                    type: "UPDATE_SHAPE",
                                                    id: shape.id,
                                                    updates: { visible: e.target.checked }
                                                });
                                            }}
                                        />
                                        <span>Visible</span>
                                    </label>
                                </div>
                                
                                <div className="mt-2 text-xs text-gray-500">
                                    ID: {shape.id.slice(0, 8)}...
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedVertices.length === 0 && selectedShapes.length === 0 && (
                <div className="text-gray-400 text-sm text-center py-8">
                    Select vertices or shapes to view properties
                </div>
            )}

            <div className="mt-6 p-3 bg-blue-50 rounded text-xs space-y-2">
                <p className="font-medium">Tips:</p>
                <p>• Shift+Click to toggle vertex selection</p>
                <p>• Drag empty space to box select</p>
                <p>• Edit values directly in properties</p>
                <p>• Batch operations for multiple vertices</p>
            </div>
        </div>
    );
};