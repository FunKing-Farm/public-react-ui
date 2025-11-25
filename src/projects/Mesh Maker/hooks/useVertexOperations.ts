// hooks/useVertexOperations.ts
import { useCallback } from 'react';
import { type Vertex, type AppState, type AppAction } from '../types';
import { isPointNearVertex, generateId } from '../utils';

interface UseVertexOperationsProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    snapToVertices: boolean;
    snapRadius: number;
    snapToGrid: boolean;
    gridSize: number;
}

export const useVertexOperations = ({
    state,
    dispatch,
    snapToVertices,
    snapRadius,
    snapToGrid,
    gridSize,
}: UseVertexOperationsProps) => {
    const snapPoint = useCallback((x: number, y: number): { x: number; y: number } => {
        if (!snapToGrid) return { x, y };
        return {
            x: Math.round(x / gridSize) * gridSize,
            y: Math.round(y / gridSize) * gridSize,
        };
    }, [snapToGrid, gridSize]);

    const findVertexAt = useCallback((x: number, y: number, threshold: number = 8): Vertex | null => {
        for (const vertex of state.vertices.values()) {
            if (isPointNearVertex(x, y, vertex, threshold)) {
                return vertex;
            }
        }
        return null;
    }, [state.vertices]);

    const findNearbyVertexForSnap = useCallback((x: number, y: number): Vertex | null => {
        if (!snapToVertices) return null;
        
        for (const vertex of state.vertices.values()) {
            if (state.selectedVertexIds.has(vertex.id)) continue;
            
            if (isPointNearVertex(x, y, vertex, snapRadius)) {
                return vertex;
            }
        }
        return null;
    }, [snapToVertices, snapRadius, state.vertices, state.selectedVertexIds]);

    const getOrCreateVertex = useCallback((x: number, y: number, type: "anchor" | "control" = "anchor"): Vertex => {
        const nearbyVertex = findNearbyVertexForSnap(x, y);
        
        if (nearbyVertex && type === "anchor") {
            return nearbyVertex;
        }
        
        return {
            id: generateId(),
            x,
            y,
            type,
        };
    }, [findNearbyVertexForSnap]);

    const mergeSelectedVertices = useCallback(() => {
        if (state.selectedVertexIds.size < 2) {
            alert("Please select at least 2 vertices to merge");
            return;
        }
        
        const vertices = Array.from(state.selectedVertexIds)
            .map(id => state.vertices.get(id))
            .filter(Boolean) as Vertex[];
        
        const avgX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
        const avgY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
        
        dispatch({
            type: "MERGE_VERTICES",
            vertexIds: Array.from(state.selectedVertexIds),
            targetPosition: { x: avgX, y: avgY },
        });
    }, [state.selectedVertexIds, state.vertices, dispatch]);

    return {
        snapPoint,
        findVertexAt,
        findNearbyVertexForSnap,
        getOrCreateVertex,
        mergeSelectedVertices,
    };
};