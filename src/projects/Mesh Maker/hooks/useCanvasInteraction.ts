// hooks/useCanvasInteraction.ts
import { useState, useCallback } from 'react';
import { type Vertex, type LineShape, type RectShape, type CircleShape, type BezierShape, type PolygonShape, type BezierSegment, type AppState, type AppAction } from '../types';
import { generateId, distance } from '../utils';

interface UseCanvasInteractionProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    tool: "select" | "vertex" | "line" | "rect" | "circle" | "bezier" | "polygon";
    currentStyle: {
        color: string;
        strokeWidth: number;
        fill: string;
        opacity: number;
    };
    findVertexAt: (x: number, y: number, threshold?: number) => Vertex | null;
    findNearbyVertexForSnap: (x: number, y: number) => Vertex | null;
    getOrCreateVertex: (x: number, y: number, type?: "anchor" | "control") => Vertex;
    snapPoint: (x: number, y: number) => { x: number; y: number };
    snapToGrid: boolean;
}

export const useCanvasInteraction = ({
    state,
    dispatch,
    tool,
    currentStyle,
    findVertexAt,
    findNearbyVertexForSnap,
    getOrCreateVertex,
    snapPoint,
    snapToGrid,
}: UseCanvasInteractionProps) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [tempVertices, setTempVertices] = useState<Vertex[]>([]);
    const [draggedVertexId, setDraggedVertexId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isDraggingRadius, setIsDraggingRadius] = useState<string | null>(null);
    const [radiusDragStart, setRadiusDragStart] = useState<{ x: number; y: number; originalRadius: number } | null>(null);
    const [selectionBox, setSelectionBox] = useState<{
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [nearbyVertexId, setNearbyVertexId] = useState<string | null>(null);

    const handleMouseDown = useCallback((point: { x: number; y: number }, e: React.MouseEvent, getViewport: () => { zoom: number; offsetX: number; offsetY: number }) => {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            setIsPanning(true);
            const viewport = getViewport();
            setPanStart({ 
                x: e.clientX - viewport.offsetX, 
                y: e.clientY - viewport.offsetY 
            });
            return;
        }
        
        if (tool === "select") {
            for (const [shapeId, shape] of state.shapes.entries()) {
                if (shape.type === "circle" && state.selectedShapeIds.has(shapeId)) {
                    const center = state.vertices.get(shape.vertexIds[0]);
                    if (center) {
                        const handleX = center.x + shape.radius;
                        const handleY = center.y;
                        const viewport = getViewport();
                        const threshold = 10 / viewport.zoom;
                        if (Math.abs(point.x - handleX) < threshold && Math.abs(point.y - handleY) < threshold) {
                            setIsDraggingRadius(shapeId);
                            setRadiusDragStart({ x: point.x, y: point.y, originalRadius: shape.radius });
                            return;
                        }
                    }
                }
            }
        }
        
        const vertex = findVertexAt(point.x, point.y);

        if (tool === "select") {
            if (vertex) {
                const isSelected = state.selectedVertexIds.has(vertex.id);
                
                if (e.shiftKey) {
                    if (isSelected) {
                        const newSelection = new Set(state.selectedVertexIds);
                        newSelection.delete(vertex.id);
                        dispatch({ type: "SELECT_VERTICES", ids: Array.from(newSelection) });
                    } else {
                        dispatch({ type: "SELECT_VERTICES", ids: [vertex.id], additive: true });
                    }
                } else if (!isSelected) {
                    dispatch({ type: "SELECT_VERTICES", ids: [vertex.id] });
                }
                
                if (isSelected || !e.shiftKey) {
                    setDraggedVertexId(vertex.id);
                    setDragOffset({
                        x: point.x - vertex.x,
                        y: point.y - vertex.y,
                    });
                }
            } else {
                let shapeClicked = false;
                for (const [shapeId, shape] of state.shapes.entries()) {
                    if (shape.type === "circle") {
                        const center = state.vertices.get(shape.vertexIds[0]);
                        if (center && distance(point, center) <= shape.radius) {
                            dispatch({ type: "SELECT_SHAPES", ids: [shapeId], additive: e.shiftKey });
                            shapeClicked = true;
                            break;
                        }
                    }
                }
                
                if (!shapeClicked) {
                    if (!e.shiftKey) {
                        dispatch({ type: "SELECT_VERTICES", ids: [] });
                        dispatch({ type: "SELECT_SHAPES", ids: [] });
                    }
                    setSelectionBox({ 
                        startX: point.x, 
                        startY: point.y, 
                        endX: point.x, 
                        endY: point.y 
                    });
                }
            }
        } else if (tool === "vertex") {
            const snappedPoint = snapPoint(point.x, point.y);
            const newVertex = getOrCreateVertex(snappedPoint.x, snappedPoint.y, "anchor");
            
            if (!state.vertices.has(newVertex.id)) {
                dispatch({ type: "ADD_VERTEX", vertex: newVertex });
            }
        } else if (tool === "line") {
            const snappedPoint = snapPoint(point.x, point.y);
            if (tempVertices.length === 0) {
                const newVertex = getOrCreateVertex(snappedPoint.x, snappedPoint.y, "anchor");
                setTempVertices([newVertex]);
            } else if (tempVertices.length === 1) {
                const endVertex = getOrCreateVertex(snappedPoint.x, snappedPoint.y, "anchor");
                
                if (!state.vertices.has(tempVertices[0].id)) {
                    dispatch({ type: "ADD_VERTEX", vertex: tempVertices[0] });
                }
                if (!state.vertices.has(endVertex.id)) {
                    dispatch({ type: "ADD_VERTEX", vertex: endVertex });
                }
                
                const line: LineShape = {
                    id: generateId(),
                    type: "line",
                    vertexIds: [tempVertices[0].id, endVertex.id],
                    style: { ...currentStyle },
                    visible: true,
                    locked: false,
                };
                dispatch({ type: "ADD_SHAPE", shape: line });
                
                setTempVertices([]);
            }
        } else if (tool === "rect") {
            const snappedPoint = snapPoint(point.x, point.y);
            if (tempVertices.length === 0) {
                const newVertex = getOrCreateVertex(snappedPoint.x, snappedPoint.y, "anchor");
                setTempVertices([newVertex]);
                setIsDrawing(true);
            }
        } else if (tool === "circle") {
            const snappedPoint = snapPoint(point.x, point.y);
            if (tempVertices.length === 0) {
                const centerVertex = getOrCreateVertex(snappedPoint.x, snappedPoint.y, "anchor");
                setTempVertices([centerVertex]);
                setIsDrawing(true);
            }
        } else if (tool === "polygon") {
            const snappedPoint = snapPoint(point.x, point.y);
            const newVertex = getOrCreateVertex(snappedPoint.x, snappedPoint.y, "anchor");
            setTempVertices([...tempVertices, newVertex]);
        } else if (tool === "bezier") {
            const snappedPoint = snapPoint(point.x, point.y);
            if (e.button === 2 && tempVertices.length >= 2) {
                const segments: BezierSegment[] = [];
                
                for (let i = 0; i < tempVertices.length - 1; i++) {
                    const p0 = tempVertices[i];
                    const p3 = tempVertices[i + 1];
                    
                    const p1: Vertex = {
                        id: generateId(),
                        x: p0.x + (p3.x - p0.x) * 0.33,
                        y: p0.y,
                        type: "control",
                        parentId: p0.id,
                    };
                    
                    const p2: Vertex = {
                        id: generateId(),
                        x: p0.x + (p3.x - p0.x) * 0.66,
                        y: p3.y,
                        type: "control",
                        parentId: p3.id,
                    };
                    
                    if (!state.vertices.has(p0.id)) {
                        dispatch({ type: "ADD_VERTEX", vertex: p0 });
                    }
                    dispatch({ type: "ADD_VERTEX", vertex: p1 });
                    dispatch({ type: "ADD_VERTEX", vertex: p2 });
                    if (i === tempVertices.length - 2 && !state.vertices.has(p3.id)) {
                        dispatch({ type: "ADD_VERTEX", vertex: p3 });
                    }
                    
                    segments.push({
                        p0: p0.id,
                        p1: p1.id,
                        p2: p2.id,
                        p3: p3.id,
                    });
                }
                
                const bezier: BezierShape = {
                    id: generateId(),
                    type: "bezier",
                    vertexIds: segments.flatMap(s => [s.p0, s.p1, s.p2, s.p3]),
                    segments,
                    closed: false,
                    style: { ...currentStyle },
                    visible: true,
                    locked: false,
                };
                
                dispatch({ type: "ADD_SHAPE", shape: bezier });
                setTempVertices([]);
            } else {
                const newVertex = getOrCreateVertex(snappedPoint.x, snappedPoint.y, "anchor");
                setTempVertices([...tempVertices, newVertex]);
            }
        }
    }, [tool, findVertexAt, state.selectedVertexIds, state.selectedShapeIds, 
        state.vertices, state.shapes, tempVertices, currentStyle, getOrCreateVertex, snapPoint, dispatch]);

    const handleMouseMove = useCallback((point: { x: number; y: number }, e: React.MouseEvent, setViewport: (v: any) => void) => {
        if (isPanning) {
            setViewport((prev: any) => ({
                ...prev,
                offsetX: e.clientX - panStart.x,
                offsetY: e.clientY - panStart.y,
            }));
            return;
        }
        
        const vertex = findVertexAt(point.x, point.y);
        dispatch({ type: "HOVER_VERTEX", id: vertex?.id || null });
        
        if (tool !== "select") {
            const nearbyVertex = findNearbyVertexForSnap(point.x, point.y);
            setNearbyVertexId(nearbyVertex?.id || null);
        } else {
            setNearbyVertexId(null);
        }
        
        if (selectionBox) {
            setSelectionBox(prev => prev ? { 
                ...prev, 
                endX: point.x, 
                endY: point.y 
            } : null);
            return;
        }
        
        if (isDraggingRadius && radiusDragStart) {
            const shape = state.shapes.get(isDraggingRadius);
            if (shape && shape.type === "circle") {
                const center = state.vertices.get(shape.vertexIds[0]);
                if (center) {
                    const newRadius = distance(point, center);
                    dispatch({
                        type: "UPDATE_SHAPE",
                        id: isDraggingRadius,
                        updates: { radius: Math.max(5, newRadius) }
                    });
                }
            }
        } else if (draggedVertexId) {
            const updates: Array<{ id: string; updates: Partial<Vertex> }> = [];
            
            if (state.selectedVertexIds.has(draggedVertexId)) {
                const draggedVertex = state.vertices.get(draggedVertexId);
                if (draggedVertex) {
                    const dx = point.x - dragOffset.x - draggedVertex.x;
                    const dy = point.y - dragOffset.y - draggedVertex.y;
                    
                    state.selectedVertexIds.forEach(id => {
                        const v = state.vertices.get(id);
                        if (v) {
                            updates.push({
                                id,
                                updates: {
                                    x: v.x + dx,
                                    y: v.y + dy,
                                }
                            });
                        }
                    });
                }
            } else {
                updates.push({
                    id: draggedVertexId,
                    updates: {
                        x: point.x - dragOffset.x,
                        y: point.y - dragOffset.y,
                    }
                });
            }
            
            if (updates.length > 0) {
                dispatch({ type: "BATCH_UPDATE", updates: { vertices: updates } });
            }
        }
    }, [findVertexAt, draggedVertexId, dragOffset, state.selectedVertexIds, 
        state.vertices, state.shapes, findNearbyVertexForSnap, 
        isDraggingRadius, radiusDragStart, isPanning, panStart, selectionBox, tool, dispatch]);

    const handleMouseUp = useCallback((point: { x: number; y: number }, e: React.MouseEvent) => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }
        
        if (selectionBox) {
            const minX = Math.min(selectionBox.startX, selectionBox.endX);
            const maxX = Math.max(selectionBox.startX, selectionBox.endX);
            const minY = Math.min(selectionBox.startY, selectionBox.endY);
            const maxY = Math.max(selectionBox.startY, selectionBox.endY);
            
            const selectedVertexIds = Array.from(state.vertices.entries())
                .filter(([_, v]) => v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY)
                .map(([id]) => id);
            
            dispatch({ type: "SELECT_VERTICES", ids: selectedVertexIds, additive: e.shiftKey });
            setSelectionBox(null);
            return;
        }
        
        if (isDraggingRadius) {
            setIsDraggingRadius(null);
            setRadiusDragStart(null);
            return;
        }
        
        if (draggedVertexId && snapToGrid) {
            const updates: Array<{ id: string; updates: Partial<Vertex> }> = [];
            
            if (state.selectedVertexIds.has(draggedVertexId)) {
                state.selectedVertexIds.forEach(id => {
                    const v = state.vertices.get(id);
                    if (v) {
                        const snapped = snapPoint(v.x, v.y);
                        updates.push({
                            id,
                            updates: { x: snapped.x, y: snapped.y }
                        });
                    }
                });
            } else {
                const v = state.vertices.get(draggedVertexId);
                if (v) {
                    const snapped = snapPoint(v.x, v.y);
                    updates.push({
                        id: draggedVertexId,
                        updates: { x: snapped.x, y: snapped.y }
                    });
                }
            }
            
            if (updates.length > 0) {
                dispatch({ type: "BATCH_UPDATE", updates: { vertices: updates } });
            }
        }
        
        if (isDrawing) {
            const snappedPoint = snapPoint(point.x, point.y);
            
            if (tool === "rect" && tempVertices.length === 1) {
                const topLeft = tempVertices[0];
                const topRight = getOrCreateVertex(snappedPoint.x, topLeft.y, "anchor");
                const bottomRight = getOrCreateVertex(snappedPoint.x, snappedPoint.y, "anchor");
                const bottomLeft = getOrCreateVertex(topLeft.x, snappedPoint.y, "anchor");
                
                [topLeft, topRight, bottomRight, bottomLeft].forEach(v => {
                    if (!state.vertices.has(v.id)) {
                        dispatch({ type: "ADD_VERTEX", vertex: v });
                    }
                });
                
                const rect: RectShape = {
                    id: generateId(),
                    type: "rect",
                    vertexIds: [topLeft.id, topRight.id, bottomRight.id, bottomLeft.id],
                    style: { ...currentStyle },
                    visible: true,
                    locked: false,
                };
                dispatch({ type: "ADD_SHAPE", shape: rect });
                
                setTempVertices([]);
                setIsDrawing(false);
            } else if (tool === "circle" && tempVertices.length === 1) {
                const radius = Math.sqrt(
                    Math.pow(point.x - tempVertices[0].x, 2) +
                    Math.pow(point.y - tempVertices[0].y, 2)
                );
                
                if (!state.vertices.has(tempVertices[0].id)) {
                    dispatch({ type: "ADD_VERTEX", vertex: tempVertices[0] });
                }
                
                const circle: CircleShape = {
                    id: generateId(),
                    type: "circle",
                    vertexIds: [tempVertices[0].id],
                    radius,
                    style: { ...currentStyle },
                    visible: true,
                    locked: false,
                };
                dispatch({ type: "ADD_SHAPE", shape: circle });
                
                setTempVertices([]);
                setIsDrawing(false);
            }
        }
        
        setDraggedVertexId(null);
    }, [isDraggingRadius, isDrawing, tool, tempVertices, currentStyle, 
        state.vertices, getOrCreateVertex, draggedVertexId, snapToGrid, snapPoint, 
        state.selectedVertexIds, isPanning, selectionBox, dispatch]);

    const handleContextMenu = useCallback((point: { x: number; y: number }, e: React.MouseEvent) => {
        if (tool === "polygon" && tempVertices.length >= 3) {
            tempVertices.forEach(v => {
                if (!state.vertices.has(v.id)) {
                    dispatch({ type: "ADD_VERTEX", vertex: v });
                }
            });
            
            const polygon: PolygonShape = {
                id: generateId(),
                type: "polygon",
                vertexIds: tempVertices.map(v => v.id),
                closed: true,
                style: { ...currentStyle },
                visible: true,
                locked: false,
            };
            dispatch({ type: "ADD_SHAPE", shape: polygon });
            setTempVertices([]);
        }
    }, [tool, tempVertices, currentStyle, state.vertices, dispatch]);

    return {
        isDrawing,
        setIsDrawing,
        tempVertices,
        setTempVertices,
        selectionBox,
        nearbyVertexId,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleContextMenu,
    };
};