// types.ts
export interface Vertex {
    id: string;
    x: number;
    y: number;
    type: "anchor" | "control";
    parentId?: string;
}

export interface BaseShape {
    id: string;
    type: "line" | "rect" | "circle" | "bezier" | "polygon";
    vertexIds: string[];
    style: {
        color: string;
        strokeWidth: number;
        fill?: string;
        opacity?: number;
    };
    visible: boolean;
    locked: boolean;
    metadata?: Record<string, any>;
}

export interface LineShape extends BaseShape {
    type: "line";
    vertexIds: [string, string];
}

export interface RectShape extends BaseShape {
    type: "rect";
    vertexIds: [string, string, string, string];
}

export interface CircleShape extends BaseShape {
    type: "circle";
    vertexIds: [string];
    radius: number;
}

export interface BezierSegment {
    p0: string;
    p1: string;
    p2: string;
    p3: string;
}

export interface BezierShape extends BaseShape {
    type: "bezier";
    segments: BezierSegment[];
    closed: boolean;
}

export interface PolygonShape extends BaseShape {
    type: "polygon";
    vertexIds: string[];
    closed: boolean;
}

export type Shape = LineShape | RectShape | CircleShape | BezierShape | PolygonShape;

export interface ShapeGroup {
    id: string;
    name: string;
    shapeIds: string[];
    locked: boolean;
}

export interface Frame {
    id: string;
    name: string;
    vertices: Map<string, { x: number; y: number }>;
    shapeProperties: Map<string, { radius?: number }>;
    timestamp: number;
}

export interface AppState {
    vertices: Map<string, Vertex>;
    shapes: Map<string, Shape>;
    groups: Map<string, ShapeGroup>;
    frames: Frame[];
    currentFrameIndex: number;
    isRecording: boolean;
    selectedVertexIds: Set<string>;
    selectedShapeIds: Set<string>;
    hoveredVertexId: string | null;
    hoveredShapeId: string | null;
    history: {
        past: Array<{
            vertices: Map<string, Vertex>;
            shapes: Map<string, Shape>;
        }>;
        future: Array<{
            vertices: Map<string, Vertex>;
            shapes: Map<string, Shape>;
        }>;
    };
}

export type AppAction =
    | { type: "ADD_VERTEX"; vertex: Vertex }
    | { type: "UPDATE_VERTEX"; id: string; updates: Partial<Vertex> }
    | { type: "DELETE_VERTEX"; id: string }
    | { type: "ADD_SHAPE"; shape: Shape }
    | { type: "UPDATE_SHAPE"; id: string; updates: Partial<Shape> }
    | { type: "DELETE_SHAPE"; id: string }
    | { type: "SELECT_VERTICES"; ids: string[]; additive?: boolean }
    | { type: "SELECT_SHAPES"; ids: string[]; additive?: boolean }
    | { type: "HOVER_VERTEX"; id: string | null }
    | { type: "HOVER_SHAPE"; id: string | null }
    | { type: "CREATE_GROUP"; name: string; shapeIds: string[] }
    | { type: "DELETE_GROUP"; id: string }
    | { type: "MERGE_VERTICES"; vertexIds: string[]; targetPosition: { x: number; y: number } }
    | { type: "IMPORT_DATA"; vertices: Map<string, Vertex>; shapes: Map<string, Shape>; groups: Map<string, ShapeGroup>; frames?: Frame[] }
    | { type: "ADD_FRAME"; frame: Frame }
    | { type: "UPDATE_FRAME"; frameIndex: number; updates: Partial<Frame> }
    | { type: "DELETE_FRAME"; frameIndex: number }
    | { type: "SET_CURRENT_FRAME"; frameIndex: number }
    | { type: "START_RECORDING" }
    | { type: "STOP_RECORDING" }
    | { type: "RECORD_FRAME"; name?: string }
    | { type: "APPLY_FRAME"; frameIndex: number }
    | { type: "INTERPOLATE_FRAMES"; fromIndex: number; toIndex: number; t: number }
    | { type: "UNDO" }
    | { type: "REDO" }
    | { type: "CLEAR_ALL" }
    | { type: "UPDATE_CURRENT_FRAME_DATA" } 
    | { type: "BATCH_UPDATE"; updates: {
        vertices?: Array<{ id: string; updates: Partial<Vertex> }>;
        shapes?: Array<{ id: string; updates: Partial<Shape> }>;
    }};

export interface MeshExport {
    version: "2.1.0";
    timestamp: string;
    vertices: Array<{
        id: string;
        position: [number, number];
        type: "anchor" | "control";
        parentId?: string;
    }>;
    shapes: Array<{
        id: string;
        type: string;
        vertexRefs: string[];
        properties: Record<string, any>;
        style: Record<string, any>;
    }>;
    groups: Array<{
        id: string;
        name: string;
        shapeRefs: string[];
    }>;
    frames?: Array<{
        id: string;
        name: string;
        timestamp: number;
        vertexPositions: Array<{
            vertexId: string;
            position: [number, number];
        }>;
        shapeProperties: Array<{
            shapeId: string;
            properties: Record<string, any>;
        }>;
    }>;
    metadata?: {
        boundingBox: {
            width: number;
            height: number;
            originalOrigin: {
                x: number;
                y: number;
            };
        };
        stats: {
            totalVertices: number;
            totalShapes: number;
            totalFrames: number;
            vertexTypes: {
                anchor: number;
                control: number;
            };
            shapeTypes: Record<string, number>;
        };
        coordinateSystem?: {
            unit: string;
            gridSize: number;
            description: string;
        };
        renderingHints?: {
            animationType: string;
            defaultAnimationDuration: number;
            recommendedTessellation: {
                bezierSegments: number;
                circleSegments: number;
            };
            colorPalette: string[];
            hasTransparency: boolean;
        };
    };
}