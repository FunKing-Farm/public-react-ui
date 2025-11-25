export interface MeshVertex {
    id: string;
    position: [number, number];
    type: 'anchor' | 'control';
    parentId?: string;
}

export interface BezierSegment {
    p0: string;
    p1: string;
    p2: string;
    p3: string;
}

export interface ShapeProperties {
    radius?: number; // For circles (in grid units)
    segments?: BezierSegment[]; // For bezier curves
    closed?: boolean; // For polygons and beziers
}

export interface MeshShape {
    id: string;
    type: 'line' | 'rect' | 'circle' | 'bezier' | 'polygon';
    vertexRefs: string[];
    properties: ShapeProperties;
    style: {
        color: string;
        strokeWidth: number;
        fill: string;
        opacity: number;
        visible: boolean;
        locked: boolean;
    };
}

export interface ShapePropertyAnimation {
    shapeId: string;
    properties: {
        radius?: number;
        [key: string]: any;
    };
}

export interface KeyFrame {
    id: string;
    name: string;
    timestamp: number;
    vertexPositions: Array<{
        vertexId: string;
        position: [number, number];
    }>;
    shapeProperties?: ShapePropertyAnimation[];
}

export interface MeshGroup {
    id: string;
    name: string;
    shapeRefs: string[];
}

export interface MeshData {
    version: string;
    timestamp: string;
    vertices: MeshVertex[];
    shapes: MeshShape[];
    groups: MeshGroup[];
    frames?: KeyFrame[]; // Optional: only present if animation frames exist
    metadata: {
        coordinateSystem: {
            unit: string;
            gridSize: number;
            description: string;
        };
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
            shapeTypes: {
                [key: string]: number;
            };
        };
        renderingHints?: {
            animationType?: 'keyframe' | 'static';
            defaultAnimationDuration?: number;
            recommendedTessellation?: {
                bezierSegments: number;
                circleSegments: number;
            };
            colorPalette?: string[];
            hasTransparency?: boolean;
        };
    };
}

export interface ProcessedMesh {
    vertices: Float32Array;
    colors: Float32Array;
    indices: Uint16Array;
    vertexCount: number;
    indexCount: number;
}