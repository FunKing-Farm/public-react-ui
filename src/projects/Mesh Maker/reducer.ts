// reducer.ts
import { type AppState, type AppAction, type Vertex, type BezierShape } from './types';
import { generateId, lerp } from './utils';

export const appReducer = (state: AppState, action: AppAction): AppState => {
    const saveHistory = (): Partial<AppState> => {
        return {
            history: {
                past: [
                    ...state.history.past,
                    {
                        vertices: new Map(state.vertices),
                        shapes: new Map(state.shapes),
                    }
                ].slice(-50),
                future: [],
            }
        };
    };

    switch (action.type) {
        case "ADD_VERTEX": {
            const newVertices = new Map(state.vertices);
            newVertices.set(action.vertex.id, action.vertex);
            return {
                ...state,
                vertices: newVertices,
                ...saveHistory(),
            };
        }

        case "UPDATE_VERTEX": {
            const vertex = state.vertices.get(action.id);
            if (!vertex) return state;
            
            const newVertices = new Map(state.vertices);
            newVertices.set(action.id, { ...vertex, ...action.updates });
            return {
                ...state,
                vertices: newVertices,
            };
        }

        case "DELETE_VERTEX": {
            const newVertices = new Map(state.vertices);
            newVertices.delete(action.id);
            
            const newShapes = new Map(state.shapes);
            const shapesToDelete: string[] = [];
            
            newShapes.forEach((shape, id) => {
                if (shape.vertexIds.includes(action.id)) {
                    shapesToDelete.push(id);
                }
            });
            
            shapesToDelete.forEach(id => newShapes.delete(id));
            
            return {
                ...state,
                vertices: newVertices,
                shapes: newShapes,
                selectedVertexIds: new Set([...state.selectedVertexIds].filter(id => id !== action.id)),
                ...saveHistory(),
            };
        }

        case "ADD_SHAPE": {
            const newShapes = new Map(state.shapes);
            newShapes.set(action.shape.id, action.shape);
            return {
                ...state,
                shapes: newShapes,
                ...saveHistory(),
            };
        }

        case "UPDATE_SHAPE": {
            const shape = state.shapes.get(action.id);
            if (!shape) return state;
            
            const newShapes = new Map(state.shapes);
            newShapes.set(action.id, { ...shape, ...action.updates });
            return {
                ...state,
                shapes: newShapes,
            };
        }

        case "DELETE_SHAPE": {
            const newShapes = new Map(state.shapes);
            const shape = newShapes.get(action.id);
            
            if (shape) {
                if (shape.type === "bezier") {
                    const bezierShape = shape as BezierShape;
                    const vertexIdsToCheck = new Set<string>();
                    bezierShape.segments.forEach(seg => {
                        vertexIdsToCheck.add(seg.p1);
                        vertexIdsToCheck.add(seg.p2);
                    });
                    
                    const newVertices = new Map(state.vertices);
                    vertexIdsToCheck.forEach(vertexId => {
                        let isUsedElsewhere = false;
                        newShapes.forEach((otherShape, otherId) => {
                            if (otherId !== action.id && otherShape.vertexIds.includes(vertexId)) {
                                isUsedElsewhere = true;
                            }
                        });
                        
                        if (!isUsedElsewhere) {
                            newVertices.delete(vertexId);
                        }
                    });
                    
                    newShapes.delete(action.id);
                    
                    return {
                        ...state,
                        shapes: newShapes,
                        vertices: newVertices,
                        selectedShapeIds: new Set([...state.selectedShapeIds].filter(id => id !== action.id)),
                        ...saveHistory(),
                    };
                }
            }
            
            newShapes.delete(action.id);
            return {
                ...state,
                shapes: newShapes,
                selectedShapeIds: new Set([...state.selectedShapeIds].filter(id => id !== action.id)),
                ...saveHistory(),
            };
        }

        case "SELECT_VERTICES": {
            if (action.additive) {
                const newSelection = new Set(state.selectedVertexIds);
                action.ids.forEach(id => newSelection.add(id));
                return { ...state, selectedVertexIds: newSelection };
            }
            return { ...state, selectedVertexIds: new Set(action.ids) };
        }

        case "SELECT_SHAPES": {
            if (action.additive) {
                const newSelection = new Set(state.selectedShapeIds);
                action.ids.forEach(id => newSelection.add(id));
                return { ...state, selectedShapeIds: newSelection };
            }
            return { ...state, selectedShapeIds: new Set(action.ids) };
        }

        case "HOVER_VERTEX":
            return { ...state, hoveredVertexId: action.id };

        case "HOVER_SHAPE":
            return { ...state, hoveredShapeId: action.id };

        case "CREATE_GROUP": {
            const newGroups = new Map(state.groups);
            const group = {
                id: generateId(),
                name: action.name,
                shapeIds: action.shapeIds,
                locked: false,
            };
            newGroups.set(group.id, group);
            return { ...state, groups: newGroups };
        }

        case "DELETE_GROUP": {
            const newGroups = new Map(state.groups);
            newGroups.delete(action.id);
            return { ...state, groups: newGroups };
        }

        case "MERGE_VERTICES": {
            if (action.vertexIds.length < 2) return state;
            
            const mergedVertex: Vertex = {
                id: generateId(),
                x: action.targetPosition.x,
                y: action.targetPosition.y,
                type: "anchor",
            };
            
            const newVertices = new Map(state.vertices);
            newVertices.set(mergedVertex.id, mergedVertex);
            
            const newShapes = new Map(state.shapes);
            const vertexIdSet = new Set(action.vertexIds);
            
            newShapes.forEach((shape, shapeId) => {
                let updated = false;
                const newShape = { ...shape };
                
                if (shape.type === "bezier") {
                    const bezierShape = shape as BezierShape;
                    const newSegments = bezierShape.segments.map(seg => {
                        const newSeg = { ...seg };
                        if (vertexIdSet.has(seg.p0)) { newSeg.p0 = mergedVertex.id; updated = true; }
                        if (vertexIdSet.has(seg.p1)) { newSeg.p1 = mergedVertex.id; updated = true; }
                        if (vertexIdSet.has(seg.p2)) { newSeg.p2 = mergedVertex.id; updated = true; }
                        if (vertexIdSet.has(seg.p3)) { newSeg.p3 = mergedVertex.id; updated = true; }
                        return newSeg;
                    });
                    
                    if (updated) {
                        const updatedBezier: BezierShape = {
                            ...bezierShape,
                            segments: newSegments,
                            vertexIds: newSegments.flatMap(s => [s.p0, s.p1, s.p2, s.p3])
                        };
                        newShapes.set(shapeId, updatedBezier);
                    }
                } else {
                    const newVertexIds = shape.vertexIds.map(vId => 
                        vertexIdSet.has(vId) ? mergedVertex.id : vId
                    ) as any;
                    
                    if (newVertexIds.some((vId: string, idx: number) => vId !== shape.vertexIds[idx])) {
                        updated = true;
                        newShapes.set(shapeId, { ...newShape, vertexIds: newVertexIds });
                    }
                }
            });
            
            action.vertexIds.forEach(id => newVertices.delete(id));
            
            return {
                ...state,
                vertices: newVertices,
                shapes: newShapes,
                selectedVertexIds: new Set([mergedVertex.id]),
                ...saveHistory(),
            };
        }

        case "IMPORT_DATA": {
            return {
                ...state,
                vertices: action.vertices,
                shapes: action.shapes,
                groups: action.groups,
                frames: action.frames || state.frames,
                currentFrameIndex: 0,
                selectedVertexIds: new Set(),
                selectedShapeIds: new Set(),
                hoveredVertexId: null,
                hoveredShapeId: null,
                ...saveHistory(),
            };
        }

        case "START_RECORDING": {
            return { ...state, isRecording: true };
        }

        case "STOP_RECORDING": {
            return { ...state, isRecording: false };
        }

        case "RECORD_FRAME": {
            const vertexPositions = new Map<string, { x: number; y: number }>();
            state.vertices.forEach((vertex, id) => {
                vertexPositions.set(id, { x: vertex.x, y: vertex.y });
            });
            
            const shapeProperties = new Map<string, { radius?: number }>();
            state.shapes.forEach((shape, id) => {
                if (shape.type === "circle") {
                    shapeProperties.set(id, { radius: shape.radius });
                }
            });
            
            const newFrame = {
                id: generateId(),
                name: action.name || `Frame ${state.frames.length + 1}`,
                vertices: vertexPositions,
                shapeProperties,
                timestamp: Date.now(),
            };
            
            return {
                ...state,
                frames: [...state.frames, newFrame],
                currentFrameIndex: state.frames.length,
            };
        }

        case "DELETE_FRAME": {
            if (action.frameIndex < 0 || action.frameIndex >= state.frames.length) return state;
            
            const newFrames = [...state.frames];
            newFrames.splice(action.frameIndex, 1);
            
            return {
                ...state,
                frames: newFrames,
                currentFrameIndex: Math.min(state.currentFrameIndex, newFrames.length - 1),
            };
        }

        case "SET_CURRENT_FRAME": {
            if (action.frameIndex < 0 || action.frameIndex >= state.frames.length) return state;
            return { ...state, currentFrameIndex: action.frameIndex };
        }

        case "APPLY_FRAME": {
            if (action.frameIndex < 0 || action.frameIndex >= state.frames.length) return state;
            
            const frame = state.frames[action.frameIndex];
            const newVertices = new Map(state.vertices);
            const newShapes = new Map(state.shapes);
            
            frame.vertices.forEach((pos, vertexId) => {
                const vertex = newVertices.get(vertexId);
                if (vertex) {
                    newVertices.set(vertexId, { ...vertex, x: pos.x, y: pos.y });
                }
            });
            
            frame.shapeProperties.forEach((props, shapeId) => {
                const shape = newShapes.get(shapeId);
                if (shape && shape.type === "circle" && props.radius !== undefined) {
                    newShapes.set(shapeId, { ...shape, radius: props.radius });
                }
            });
            
            return {
                ...state,
                vertices: newVertices,
                shapes: newShapes,
                currentFrameIndex: action.frameIndex,
            };
        }

        case "INTERPOLATE_FRAMES": {
            const fromFrame = state.frames[action.fromIndex];
            const toFrame = state.frames[action.toIndex];
            if (!fromFrame || !toFrame) return state;
            
            const newVertices = new Map(state.vertices);
            const newShapes = new Map(state.shapes);
            const t = Math.max(0, Math.min(1, action.t));
            
            state.vertices.forEach((vertex, id) => {
                const fromPos = fromFrame.vertices.get(id);
                const toPos = toFrame.vertices.get(id);
                
                if (fromPos && toPos) {
                    newVertices.set(id, {
                        ...vertex,
                        x: lerp(fromPos.x, toPos.x, t),
                        y: lerp(fromPos.y, toPos.y, t),
                    });
                }
            });
            
            state.shapes.forEach((shape, id) => {
                if (shape.type === "circle") {
                    const fromProps = fromFrame.shapeProperties.get(id);
                    const toProps = toFrame.shapeProperties.get(id);
                    
                    if (fromProps?.radius !== undefined && toProps?.radius !== undefined) {
                        newShapes.set(id, {
                            ...shape,
                            radius: lerp(fromProps.radius, toProps.radius, t),
                        });
                    }
                }
            });
            
            return {
                ...state,
                vertices: newVertices,
                shapes: newShapes,
            };
        }

        case "UPDATE_FRAME": {
            if (action.frameIndex < 0 || action.frameIndex >= state.frames.length) return state;
            
            const newFrames = [...state.frames];
            newFrames[action.frameIndex] = {
                ...newFrames[action.frameIndex],
                ...action.updates,
            };
            
            return { ...state, frames: newFrames };
        }

        case "UPDATE_CURRENT_FRAME_DATA": {
            if (state.currentFrameIndex < 0 || state.currentFrameIndex >= state.frames.length) return state;
            
            const vertexPositions = new Map<string, { x: number; y: number }>();
            state.vertices.forEach((vertex, id) => {
                vertexPositions.set(id, { x: vertex.x, y: vertex.y });
            });
            
            const shapeProperties = new Map<string, { radius?: number }>();
            state.shapes.forEach((shape, id) => {
                if (shape.type === "circle") {
                    shapeProperties.set(id, { radius: shape.radius });
                }
            });
            
            const newFrames = [...state.frames];
            newFrames[state.currentFrameIndex] = {
                ...newFrames[state.currentFrameIndex],
                vertices: vertexPositions,
                shapeProperties,
                timestamp: Date.now(),
            };
            
            return { ...state, frames: newFrames };
        }

        case "BATCH_UPDATE": {
            let newVertices = new Map(state.vertices);
            let newShapes = new Map(state.shapes);
            
            if (action.updates.vertices) {
                action.updates.vertices.forEach(({ id, updates }) => {
                    const vertex = newVertices.get(id);
                    if (vertex) {
                        newVertices.set(id, { ...vertex, ...updates });
                    }
                });
            }
            
            if (action.updates.shapes) {
                action.updates.shapes.forEach(({ id, updates }) => {
                    const shape = newShapes.get(id);
                    if (shape) {
                        newShapes.set(id, { ...shape, ...updates } as any);
                    }
                });
            }
            
            return {
                ...state,
                vertices: newVertices,
                shapes: newShapes,
            };
        }

        case "UNDO": {
            if (state.history.past.length === 0) return state;
            
            const previous = state.history.past[state.history.past.length - 1];
            const newPast = state.history.past.slice(0, -1);
            
            return {
                ...state,
                vertices: previous.vertices,
                shapes: previous.shapes,
                history: {
                    past: newPast,
                    future: [
                        {
                            vertices: state.vertices,
                            shapes: state.shapes,
                        },
                        ...state.history.future,
                    ],
                },
            };
        }

        case "REDO": {
            if (state.history.future.length === 0) return state;
            
            const next = state.history.future[0];
            const newFuture = state.history.future.slice(1);
            
            return {
                ...state,
                vertices: next.vertices,
                shapes: next.shapes,
                history: {
                    past: [
                        ...state.history.past,
                        {
                            vertices: state.vertices,
                            shapes: state.shapes,
                        },
                    ],
                    future: newFuture,
                },
            };
        }

        case "CLEAR_ALL":
            return {
                vertices: new Map(),
                shapes: new Map(),
                groups: new Map(),
                frames: [],
                currentFrameIndex: 0,
                isRecording: false,
                selectedVertexIds: new Set(),
                selectedShapeIds: new Set(),
                hoveredVertexId: null,
                hoveredShapeId: null,
                history: { past: [], future: [] },
            };

        default:
            return state;
    }
};