// Canvas.tsx
import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { type Vertex, type Shape, type BezierShape } from './types';

interface CanvasProps {
    width: number;
    height: number;
    vertices: Map<string, Vertex>;
    shapes: Map<string, Shape>;
    selectedVertexIds: Set<string>;
    selectedShapeIds: Set<string>;
    hoveredVertexId: string | null;
    hoveredShapeId: string | null;
    tempVertices: Vertex[];
    selectionBox: {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null;
    tool: "select" | "vertex" | "line" | "rect" | "circle" | "bezier" | "polygon";
    currentStyle: {
        color: string;
        strokeWidth: number;
        fill: string;
        opacity: number;
    };
    showGrid: boolean;
    showVertices: boolean;
    showControlHandles: boolean;
    showExportPreview: boolean;
    nearbyVertexId: string | null;
    snapToVertices: boolean;
    gridSize: number;
    currentFrameIndex: number;
    totalFrames: number;
    isRecording: boolean;
    frames: Array<{
        id: string;
        name: string;
        vertices: Map<string, { x: number; y: number }>;
        shapeProperties: Map<string, { radius?: number }>;
        timestamp: number;
    }>;
    // Add preview state props
    isDrawing: boolean;
    previewPoint?: { x: number; y: number };
    onMouseDown: (point: { x: number; y: number }, e: React.MouseEvent) => void;
    onMouseMove: (point: { x: number; y: number }, e: React.MouseEvent) => void;
    onMouseUp: (point: { x: number; y: number }, e: React.MouseEvent) => void;
    onContextMenu: (point: { x: number; y: number }, e: React.MouseEvent) => void;
    onWheel?: (e: React.WheelEvent) => void;
}

export interface CanvasHandle {
    getViewport: () => { zoom: number; offsetX: number; offsetY: number };
    setViewport: (viewport: { zoom: number; offsetX: number; offsetY: number }) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetViewport: () => void;
    screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
    canvasToScreen: (canvasX: number, canvasY: number) => { x: number; y: number };
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>((props, ref) => {
    const {
        width,
        height,
        vertices,
        shapes,
        selectedVertexIds,
        selectedShapeIds,
        hoveredVertexId,
        hoveredShapeId,
        tempVertices,
        selectionBox,
        tool,
        currentStyle,
        showGrid,
        showVertices,
        showControlHandles,
        showExportPreview,
        nearbyVertexId,
        snapToVertices,
        gridSize,
        currentFrameIndex,
        totalFrames,
        isRecording,
        frames,
        isDrawing,
        previewPoint,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onContextMenu,
        onWheel,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [viewport, setViewport] = React.useState({
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
    });

    // Store current mouse position for preview
    const [currentMousePos, setCurrentMousePos] = React.useState<{ x: number; y: number } | null>(null);

    // Coordinate transformation utilities
    const screenToCanvas = useCallback((screenX: number, screenY: number) => {
        return {
            x: (screenX - viewport.offsetX) / viewport.zoom,
            y: (screenY - viewport.offsetY) / viewport.zoom,
        };
    }, [viewport]);

    const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
        return {
            x: canvasX * viewport.zoom + viewport.offsetX,
            y: canvasY * viewport.zoom + viewport.offsetY,
        };
    }, [viewport]);

    const getCanvasPoint = useCallback((e: React.MouseEvent): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const screenPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        return screenToCanvas(screenPoint.x, screenPoint.y);
    }, [screenToCanvas]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        getViewport: () => viewport,
        setViewport: (newViewport) => setViewport(newViewport),
        zoomIn: () => setViewport(prev => ({ 
            ...prev, 
            zoom: Math.min(5, prev.zoom * 1.2) 
        })),
        zoomOut: () => setViewport(prev => ({ 
            ...prev, 
            zoom: Math.max(0.1, prev.zoom / 1.2) 
        })),
        resetViewport: () => setViewport({ zoom: 1, offsetX: 0, offsetY: 0 }),
        screenToCanvas,
        canvasToScreen,
    }));

    // Drawing function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.setTransform(viewport.zoom, 0, 0, viewport.zoom, viewport.offsetX, viewport.offsetY);

        // Draw grid
        if (showGrid) {
            ctx.strokeStyle = "#e0e0e0";
            ctx.lineWidth = 1 / viewport.zoom;
            const gridStart = {
                x: Math.floor((-viewport.offsetX / viewport.zoom) / gridSize) * gridSize,
                y: Math.floor((-viewport.offsetY / viewport.zoom) / gridSize) * gridSize,
            };
            const gridEnd = {
                x: Math.ceil((canvas.width - viewport.offsetX) / viewport.zoom / gridSize) * gridSize,
                y: Math.ceil((canvas.height - viewport.offsetY) / viewport.zoom / gridSize) * gridSize,
            };
            
            for (let x = gridStart.x; x <= gridEnd.x; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, gridStart.y);
                ctx.lineTo(x, gridEnd.y);
                ctx.stroke();
            }
            for (let y = gridStart.y; y <= gridEnd.y; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(gridStart.x, y);
                ctx.lineTo(gridEnd.x, y);
                ctx.stroke();
            }
        }

        // Draw shapes
        shapes.forEach((shape, shapeId) => {
            if (!shape.visible) return;

            const isSelected = selectedShapeIds.has(shapeId);
            const isHovered = hoveredShapeId === shapeId;
            
            ctx.save();
            ctx.strokeStyle = isSelected ? "#0066ff" : (isHovered ? "#0099ff" : shape.style.color);
            ctx.lineWidth = (shape.style.strokeWidth * (isSelected ? 1.5 : 1)) / viewport.zoom;
            ctx.globalAlpha = shape.style.opacity || 1;
            
            if (shape.style.fill) {
                ctx.fillStyle = shape.style.fill;
            }

            switch (shape.type) {
                case "line": {
                    const v1 = vertices.get(shape.vertexIds[0]);
                    const v2 = vertices.get(shape.vertexIds[1]);
                    if (v1 && v2) {
                        ctx.beginPath();
                        ctx.moveTo(v1.x, v1.y);
                        ctx.lineTo(v2.x, v2.y);
                        ctx.stroke();
                    }
                    break;
                }

                case "rect": {
                    const rectVertices = shape.vertexIds.map(id => vertices.get(id)).filter(Boolean) as Vertex[];
                    if (rectVertices.length === 4) {
                        ctx.beginPath();
                        ctx.moveTo(rectVertices[0].x, rectVertices[0].y);
                        rectVertices.slice(1).forEach(v => ctx.lineTo(v.x, v.y));
                        ctx.closePath();
                        if (shape.style.fill) ctx.fill();
                        ctx.stroke();
                    }
                    break;
                }

                case "circle": {
                    const center = vertices.get(shape.vertexIds[0]);
                    if (center) {
                        ctx.beginPath();
                        ctx.arc(center.x, center.y, shape.radius, 0, Math.PI * 2);
                        if (shape.style.fill) ctx.fill();
                        ctx.stroke();
                        
                        if (isSelected) {
                            ctx.save();
                            ctx.strokeStyle = "#ff6600";
                            ctx.lineWidth = 1 / viewport.zoom;
                            ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
                            ctx.beginPath();
                            ctx.moveTo(center.x, center.y);
                            ctx.lineTo(center.x + shape.radius, center.y);
                            ctx.stroke();
                            ctx.setLineDash([]);
                            
                            ctx.fillStyle = "#ff6600";
                            ctx.beginPath();
                            ctx.arc(center.x + shape.radius, center.y, 6 / viewport.zoom, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    }
                    break;
                }

                case "bezier": {
                    const bezierShape = shape as BezierShape;
                    ctx.beginPath();
                    let firstMove = true;
                    
                    bezierShape.segments.forEach(segment => {
                        const p0 = vertices.get(segment.p0);
                        const p1 = vertices.get(segment.p1);
                        const p2 = vertices.get(segment.p2);
                        const p3 = vertices.get(segment.p3);
                        
                        if (p0 && p1 && p2 && p3) {
                            if (firstMove) {
                                ctx.moveTo(p0.x, p0.y);
                                firstMove = false;
                            }
                            ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
                        }
                    });
                    
                    if (bezierShape.closed) {
                        ctx.closePath();
                        if (shape.style.fill) ctx.fill();
                    }
                    ctx.stroke();
                    
                    if (isSelected && showControlHandles) {
                        bezierShape.segments.forEach(segment => {
                            const p0 = vertices.get(segment.p0);
                            const p1 = vertices.get(segment.p1);
                            const p2 = vertices.get(segment.p2);
                            const p3 = vertices.get(segment.p3);
                            
                            if (p0 && p1 && p2 && p3) {
                                ctx.strokeStyle = "#888";
                                ctx.lineWidth = 1 / viewport.zoom;
                                ctx.beginPath();
                                ctx.moveTo(p0.x, p0.y);
                                ctx.lineTo(p1.x, p1.y);
                                ctx.moveTo(p3.x, p3.y);
                                ctx.lineTo(p2.x, p2.y);
                                ctx.stroke();
                            }
                        });
                    }
                    break;
                }

                case "polygon": {
                    const polyVertices = shape.vertexIds.map(id => vertices.get(id)).filter(Boolean) as Vertex[];
                    if (polyVertices.length > 0) {
                        ctx.beginPath();
                        ctx.moveTo(polyVertices[0].x, polyVertices[0].y);
                        polyVertices.slice(1).forEach(v => ctx.lineTo(v.x, v.y));
                        if (shape.closed) {
                            ctx.closePath();
                            if (shape.style.fill) ctx.fill();
                        }
                        ctx.stroke();
                    }
                    break;
                }
            }
            
            ctx.restore();
        });

        // Draw preview for rectangle while dragging
        if (isDrawing && tool === "rect" && tempVertices.length === 1 && currentMousePos) {
            ctx.save();
            ctx.strokeStyle = currentStyle.color;
            ctx.lineWidth = currentStyle.strokeWidth / viewport.zoom;
            ctx.globalAlpha = 0.6; // Make preview slightly transparent
            
            if (currentStyle.fill) {
                ctx.fillStyle = currentStyle.fill;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(
                    tempVertices[0].x,
                    tempVertices[0].y,
                    currentMousePos.x - tempVertices[0].x,
                    currentMousePos.y - tempVertices[0].y
                );
                ctx.globalAlpha = 0.6;
            }
            
            ctx.strokeRect(
                tempVertices[0].x,
                tempVertices[0].y,
                currentMousePos.x - tempVertices[0].x,
                currentMousePos.y - tempVertices[0].y
            );
            ctx.restore();
        }

        // Draw preview for circle while dragging
        if (isDrawing && tool === "circle" && tempVertices.length === 1 && currentMousePos) {
            const radius = Math.sqrt(
                Math.pow(currentMousePos.x - tempVertices[0].x, 2) +
                Math.pow(currentMousePos.y - tempVertices[0].y, 2)
            );
            
            ctx.save();
            ctx.strokeStyle = currentStyle.color;
            ctx.lineWidth = currentStyle.strokeWidth / viewport.zoom;
            ctx.globalAlpha = 0.6; // Make preview slightly transparent
            
            if (currentStyle.fill) {
                ctx.fillStyle = currentStyle.fill;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(tempVertices[0].x, tempVertices[0].y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 0.6;
            }
            
            ctx.beginPath();
            ctx.arc(tempVertices[0].x, tempVertices[0].y, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw radius line while creating
            ctx.strokeStyle = "#666";
            ctx.lineWidth = 1 / viewport.zoom;
            ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
            ctx.beginPath();
            ctx.moveTo(tempVertices[0].x, tempVertices[0].y);
            ctx.lineTo(currentMousePos.x, currentMousePos.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Show radius value
            ctx.restore();
            ctx.save();
            const screenPos = canvasToScreen(
                tempVertices[0].x + radius / 2,
                tempVertices[0].y - 10
            );
            ctx.fillStyle = "#333";
            ctx.font = "12px Arial";
            ctx.fillText(`r: ${Math.round(radius)}px`, screenPos.x, screenPos.y);
            
            ctx.restore();
        }

        // Draw vertices
        if (showVertices) {
            vertices.forEach((vertex, vertexId) => {
                const isSelected = selectedVertexIds.has(vertexId);
                const isHovered = hoveredVertexId === vertexId;
                const isNearby = nearbyVertexId === vertexId;
                
                const size = (isNearby ? 7 : 5) / viewport.zoom;
                
                ctx.beginPath();
                if (vertex.type === "control") {
                    ctx.save();
                    ctx.translate(vertex.x, vertex.y);
                    ctx.rotate(Math.PI / 4);
                    ctx.fillStyle = isSelected ? "#ff0000" : (isHovered ? "#ff6666" : (isNearby ? "#ffaa00" : "#00aa00"));
                    ctx.fillRect(-size/2, -size/2, size, size);
                    ctx.restore();
                } else {
                    ctx.fillStyle = isSelected ? "#ff0000" : (isHovered ? "#ff6666" : (isNearby ? "#ffaa00" : "#0066ff"));
                    ctx.arc(vertex.x, vertex.y, size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    if (isNearby && snapToVertices) {
                        ctx.strokeStyle = "#ffaa00";
                        ctx.lineWidth = 2 / viewport.zoom;
                        ctx.beginPath();
                        ctx.arc(vertex.x, vertex.y, 10 / viewport.zoom, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            });
        }

        // Draw selection box
        if (selectionBox) {
            ctx.strokeStyle = "#0066ff";
            ctx.lineWidth = 1 / viewport.zoom;
            ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
            ctx.fillStyle = "rgba(0, 102, 255, 0.1)";
            ctx.fillRect(
                selectionBox.startX,
                selectionBox.startY,
                selectionBox.endX - selectionBox.startX,
                selectionBox.endY - selectionBox.startY
            );
            ctx.strokeRect(
                selectionBox.startX,
                selectionBox.startY,
                selectionBox.endX - selectionBox.startX,
                selectionBox.endY - selectionBox.startY
            );
            ctx.setLineDash([]);
        }

        // Draw temporary vertices
        tempVertices.forEach((vertex, index) => {
            ctx.beginPath();
            ctx.fillStyle = "#ff00ff";
            ctx.arc(vertex.x, vertex.y, 4 / viewport.zoom, 0, Math.PI * 2);
            ctx.fill();
            
            if (index > 0 && (tool === "polygon" || tool === "bezier")) {
                ctx.beginPath();
                ctx.strokeStyle = currentStyle.color;
                ctx.lineWidth = currentStyle.strokeWidth / viewport.zoom;
                ctx.moveTo(tempVertices[index - 1].x, tempVertices[index - 1].y);
                ctx.lineTo(vertex.x, vertex.y);
                ctx.stroke();
            }
        });

        // Draw export preview bounding box
        if (showExportPreview) {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            
            vertices.forEach(vertex => {
                minX = Math.min(minX, vertex.x);
                minY = Math.min(minY, vertex.y);
                maxX = Math.max(maxX, vertex.x);
                maxY = Math.max(maxY, vertex.y);
            });
            
            frames.forEach(frame => {
                frame.vertices.forEach(pos => {
                    minX = Math.min(minX, pos.x);
                    minY = Math.min(minY, pos.y);
                    maxX = Math.max(maxX, pos.x);
                    maxY = Math.max(maxY, pos.y);
                });
            });
            
            if (isFinite(minX)) {
                ctx.save();
                ctx.strokeStyle = "#ff00ff";
                ctx.lineWidth = 2 / viewport.zoom;
                ctx.setLineDash([10 / viewport.zoom, 5 / viewport.zoom]);
                ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
                ctx.setLineDash([]);
                
                ctx.fillStyle = "#ff00ff";
                ctx.beginPath();
                ctx.arc(minX, minY, 8 / viewport.zoom, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
                ctx.save();
                const screenOrigin = canvasToScreen(minX, minY);
                const widthInGrid = Math.round(((maxX - minX) / gridSize) * 100) / 100;
                const heightInGrid = Math.round(((maxY - minY) / gridSize) * 100) / 100;
                ctx.fillStyle = "#ff00ff";
                ctx.font = "12px Arial";
                ctx.fillText("Origin (0,0)", screenOrigin.x + 10, screenOrigin.y - 10);
                ctx.fillText(`Size: ${widthInGrid}×${heightInGrid} grid units`, screenOrigin.x + 10, screenOrigin.y + 20);
                ctx.fillText(`(${Math.round(maxX - minX)}×${Math.round(maxY - minY)}px)`, screenOrigin.x + 10, screenOrigin.y + 35);
                
                ctx.restore();
            }
        }

        ctx.restore();

        // Draw UI overlays (frame info, zoom level)
        if (totalFrames > 0) {
            ctx.save();
            ctx.fillStyle = isRecording ? "#ff0000" : "#000000";
            ctx.font = "14px Arial";
            ctx.fillText(`Frame: ${currentFrameIndex + 1}/${totalFrames}`, 10, 20);
            ctx.fillText(`Zoom: ${Math.round(viewport.zoom * 100)}%`, 10, 40);
            if (isRecording) {
                ctx.fillStyle = "#ff0000";
                ctx.beginPath();
                ctx.arc(100, 15, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }, [
        vertices, shapes, selectedVertexIds, selectedShapeIds, hoveredVertexId, hoveredShapeId,
        showGrid, gridSize, showVertices, showControlHandles, tempVertices, tool, currentStyle,
        nearbyVertexId, snapToVertices, totalFrames, currentFrameIndex, isRecording, viewport,
        selectionBox, showExportPreview, frames, canvasToScreen, isDrawing, currentMousePos
    ]);

    // Redraw when dependencies change
    useEffect(() => {
        draw();
    }, [draw]);

    // Mouse event handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const point = getCanvasPoint(e);
        setCurrentMousePos(point);
        onMouseDown(point, e);
    }, [getCanvasPoint, onMouseDown]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const point = getCanvasPoint(e);
        setCurrentMousePos(point);
        onMouseMove(point, e);
    }, [getCanvasPoint, onMouseMove]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        const point = getCanvasPoint(e);
        setCurrentMousePos(null); // Clear mouse position on mouse up
        onMouseUp(point, e);
    }, [getCanvasPoint, onMouseUp]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const point = getCanvasPoint(e);
        onContextMenu(point, e);
    }, [getCanvasPoint, onContextMenu]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        
        if (onWheel) {
            onWheel(e);
        }
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        setViewport(prev => {
            const newZoom = Math.max(0.1, Math.min(5, prev.zoom * delta));
            const scale = newZoom / prev.zoom;
            
            return {
                zoom: newZoom,
                offsetX: mouseX - (mouseX - prev.offsetX) * scale,
                offsetY: mouseY - (mouseY - prev.offsetY) * scale,
            };
        });
    }, [onWheel]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onWheel={handleWheel}
            className="border-2 border-gray-400 rounded-lg bg-white shadow-2xl cursor-crosshair"
        />
    );
});

Canvas.displayName = 'Canvas';