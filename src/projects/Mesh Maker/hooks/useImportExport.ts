// hooks/useImportExport.ts
import { useCallback, useState } from 'react';
import { type AppState, type AppAction, type MeshExport, type BezierSegment } from '../types';
import { validateImportData, parseImportData, generateId } from '../utils';

interface UseImportExportProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    gridSize: number;
}

export const useImportExport = ({ state, dispatch, gridSize }: UseImportExportProps) => {
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ 
        type: null, 
        message: '' 
    });

    const exportToJSON = useCallback(() => {
        const calculateGlobalBoundingBox = () => {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            
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
            
            if (!isFinite(minX)) {
                return { originX: 0, originY: 0, width: 0, height: 0 };
            }
            
            return {
                originX: minX,
                originY: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        };
        
        const boundingBox = calculateGlobalBoundingBox();
        
        const toGridUnits = (pixelX: number, pixelY: number): [number, number] => {
            const relativeX = pixelX - boundingBox.originX;
            const relativeY = pixelY - boundingBox.originY;
            
            const gridX = Math.round((relativeX / gridSize) * 100) / 100;
            const gridY = Math.round((relativeY / gridSize) * 100) / 100;
            
            return [gridX, gridY];
        };
        
        const exportData: MeshExport = {
            version: "2.1.0",
            timestamp: new Date().toISOString(),
            vertices: Array.from(state.vertices.values()).map(v => ({
                id: v.id,
                position: toGridUnits(v.x, v.y),
                type: v.type,
                parentId: v.parentId,
            })),
            shapes: Array.from(state.shapes.values()).map(shape => {
                const properties: Record<string, any> = {};
                
                if (shape.type === "circle") {
                    properties.radius = Math.round((shape.radius / gridSize) * 100) / 100;
                } else if (shape.type === "bezier") {
                    properties.segments = shape.segments.map((seg: BezierSegment) => ({
                        p0: seg.p0,
                        p1: seg.p1,
                        p2: seg.p2,
                        p3: seg.p3
                    }));
                    properties.closed = shape.closed;
                } else if (shape.type === "polygon") {
                    properties.closed = shape.closed;
                }
                
                return {
                    id: shape.id,
                    type: shape.type,
                    vertexRefs: shape.vertexIds,
                    properties,
                    style: {
                        color: shape.style.color,
                        strokeWidth: shape.style.strokeWidth,
                        fill: shape.style.fill || "",
                        opacity: shape.style.opacity ?? 1,
                        visible: shape.visible,
                        locked: shape.locked,
                    },
                };
            }),
            groups: Array.from(state.groups.values()).map(g => ({
                id: g.id,
                name: g.name,
                shapeRefs: g.shapeIds,
            })),
            frames: state.frames.length > 0 ? state.frames.map(frame => ({
                id: frame.id,
                name: frame.name,
                timestamp: frame.timestamp,
                vertexPositions: Array.from(frame.vertices.entries()).map(([id, pos]) => ({
                    vertexId: id,
                    position: toGridUnits(pos.x, pos.y),
                })),
                shapeProperties: Array.from(frame.shapeProperties.entries())
                    .filter(([_, props]) => Object.keys(props).length > 0)
                    .map(([id, props]) => ({
                        shapeId: id,
                        properties: props.radius !== undefined ? {
                            ...props,
                            radius: Math.round((props.radius / gridSize) * 100) / 100
                        } : props,
                    })),
            })) : [],
        };
        
        const exportWithMetadata = {
            ...exportData,
            metadata: {
                coordinateSystem: {
                    unit: "grid",
                    gridSize: gridSize,
                    description: `1 unit = ${gridSize} pixels`
                },
                boundingBox: {
                    width: Math.round((boundingBox.width / gridSize) * 100) / 100,
                    height: Math.round((boundingBox.height / gridSize) * 100) / 100,
                    originalOrigin: {
                        x: Math.round(boundingBox.originX * 100) / 100,
                        y: Math.round(boundingBox.originY * 100) / 100,
                    }
                },
                stats: {
                    totalVertices: state.vertices.size,
                    totalShapes: state.shapes.size,
                    totalFrames: state.frames.length,
                    vertexTypes: {
                        anchor: Array.from(state.vertices.values()).filter(v => v.type === "anchor").length,
                        control: Array.from(state.vertices.values()).filter(v => v.type === "control").length,
                    },
                    shapeTypes: Array.from(state.shapes.values()).reduce((acc, shape) => {
                        acc[shape.type] = (acc[shape.type] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>),
                },
                renderingHints: {
                    animationType: state.frames.length > 1 ? "keyframe" : "static",
                    defaultAnimationDuration: 3000,
                    recommendedTessellation: {
                        bezierSegments: 20,
                        circleSegments: 32,
                    },
                    colorPalette: Array.from(new Set(
                        Array.from(state.shapes.values()).map(s => s.style.color)
                    )),
                    hasTransparency: Array.from(state.shapes.values()).some(s => 
                        (s.style.opacity && s.style.opacity < 1) || 
                        (s.style.fill && s.style.fill.length === 9)
                    ),
                }
            }
        };
        
        const json = JSON.stringify(exportWithMetadata, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `mesh_export_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        const widthInGrid = Math.round((boundingBox.width / gridSize) * 100) / 100;
        const heightInGrid = Math.round((boundingBox.height / gridSize) * 100) / 100;
        setImportStatus({
            type: 'success',
            message: `Exported: ${state.vertices.size} vertices, ${state.shapes.size} shapes, ${state.frames.length} frames. Size: ${widthInGrid}×${heightInGrid} grid units`
        });
        
        setTimeout(() => {
            setImportStatus({ type: null, message: '' });
        }, 5000);
    }, [state, gridSize]);

    const importFromJSON = useCallback((jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            
            if (!validateImportData(data)) {
                throw new Error("Invalid import data format");
            }
            
            const { vertices, shapes, groups, frames } = parseImportData(data, gridSize);
            
            const shouldMerge = state.vertices.size > 0 || state.shapes.size > 0;
            
            if (shouldMerge) {
                const confirmMerge = window.confirm(
                    "Do you want to merge with existing content?\n\n" +
                    "OK = Merge (add to existing)\n" +
                    "Cancel = Replace (clear existing)"
                );
                
                if (confirmMerge) {
                    const mergedVertices = new Map(state.vertices);
                    const mergedShapes = new Map(state.shapes);
                    const mergedGroups = new Map(state.groups);
                    const mergedFrames = [...state.frames, ...frames];
                    
                    vertices.forEach((v, id) => mergedVertices.set(id, v));
                    shapes.forEach((s, id) => mergedShapes.set(id, s));
                    groups.forEach((g, id) => mergedGroups.set(id, g));
                    
                    dispatch({
                        type: "IMPORT_DATA",
                        vertices: mergedVertices,
                        shapes: mergedShapes,
                        groups: mergedGroups,
                        frames: mergedFrames,
                    });
                    
                    setImportStatus({
                        type: 'success',
                        message: `Merged: ${vertices.size} vertices, ${shapes.size} shapes, ${frames.length} frames`
                    });
                } else {
                    dispatch({
                        type: "IMPORT_DATA",
                        vertices,
                        shapes,
                        groups,
                        frames,
                    });
                    
                    setImportStatus({
                        type: 'success',
                        message: `Imported: ${vertices.size} vertices, ${shapes.size} shapes, ${frames.length} frames`
                    });
                }
            } else {
                dispatch({
                    type: "IMPORT_DATA",
                    vertices,
                    shapes,
                    groups,
                    frames,
                });
                
                setImportStatus({
                    type: 'success',
                    message: `Imported: ${vertices.size} vertices, ${shapes.size} shapes, ${frames.length} frames`
                });
            }
            
            setTimeout(() => {
                setImportStatus({ type: null, message: '' });
            }, 3000);
            
        } catch (error) {
            console.error("Import error:", error);
            setImportStatus({
                type: 'error',
                message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            
            setTimeout(() => {
                setImportStatus({ type: null, message: '' });
            }, 5000);
        }
    }, [state.vertices.size, state.shapes.size, state.groups, state.frames, gridSize, dispatch]);

    const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            if (typeof content === 'string') {
                importFromJSON(content);
            }
        };
        reader.onerror = () => {
            setImportStatus({
                type: 'error',
                message: 'Failed to read file'
            });
            setTimeout(() => {
                setImportStatus({ type: null, message: '' });
            }, 5000);
        };
        reader.readAsText(file);
        
        event.target.value = '';
    }, [importFromJSON]);

    const handlePaste = useCallback((event: React.ClipboardEvent | ClipboardEvent) => {
        const pastedText = event.clipboardData?.getData('text');
        if (!pastedText) return;
        
        try {
            const data = JSON.parse(pastedText);
            if (validateImportData(data)) {
                importFromJSON(pastedText);
            }
        } catch {
            // Not valid JSON, ignore
        }
    }, [importFromJSON]);

    return {
        exportToJSON,
        importFromJSON,
        handleFileImport,
        handlePaste,
        importStatus,
    };
};