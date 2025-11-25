// utils.ts
import {type Vertex, type MeshExport,type Shape,type ShapeGroup, type Frame } from './types.ts';

export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const distance = (v1: Vertex | { x: number; y: number }, v2: Vertex | { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
};

export const isPointNearVertex = (x: number, y: number, vertex: Vertex, threshold: number = 10): boolean => {
    return Math.sqrt(Math.pow(x - vertex.x, 2) + Math.pow(y - vertex.y, 2)) < threshold;
};

export const cubicBezier = (
    p0: Vertex, p1: Vertex, p2: Vertex, p3: Vertex, t: number
): { x: number; y: number } => {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    return {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
};

export const lerp = (a: number, b: number, t: number): number => {
    return a + (b - a) * t;
};

export const validateImportData = (data: any): data is MeshExport => {
    if (!data || typeof data !== 'object') return false;
    if (!data.version?.startsWith("2.")) {
        console.warn(`Import version mismatch. Expected 2.x.x, got ${data.version}`);
    }
    if (!Array.isArray(data.vertices)) return false;
    if (!Array.isArray(data.shapes)) return false;
    if (!Array.isArray(data.groups)) return false;
    
    for (const vertex of data.vertices) {
        if (!vertex.id || !Array.isArray(vertex.position) || vertex.position.length !== 2) {
            return false;
        }
        if (vertex.type !== "anchor" && vertex.type !== "control") {
            return false;
        }
    }
    
    for (const shape of data.shapes) {
        if (!shape.id || !shape.type || !Array.isArray(shape.vertexRefs)) {
            return false;
        }
    }
    
    if (data.frames) {
        if (!Array.isArray(data.frames)) return false;
        for (const frame of data.frames) {
            if (!frame.id || !frame.name || !Array.isArray(frame.vertexPositions)) {
                return false;
            }
        }
    }
    
    return true;
};

export const parseImportData = (importData: MeshExport, gridSize: number): { 
    vertices: Map<string, Vertex>; 
    shapes: Map<string, Shape>; 
    groups: Map<string, ShapeGroup>;
    frames: Frame[];
} => {
    const vertices = new Map<string, Vertex>();
    const shapes = new Map<string, Shape>();
    const groups = new Map<string, ShapeGroup>();
    const frames: Frame[] = [];
    
    const usesGridUnits = importData.metadata?.coordinateSystem?.unit === "grid";
    const importGridSize = importData.metadata?.coordinateSystem?.gridSize || gridSize;
    
    const fromGridUnits = (gridX: number, gridY: number): [number, number] => {
        if (usesGridUnits) {
            return [gridX * importGridSize, gridY * importGridSize];
        }
        return [gridX, gridY];
    };
    
    importData.vertices.forEach(v => {
        const [x, y] = fromGridUnits(v.position[0], v.position[1]);
        vertices.set(v.id, {
            id: v.id,
            x,
            y,
            type: v.type,
            parentId: v.parentId,
        });
    });
    
    importData.shapes.forEach(s => {
        const baseShape: any = {
            id: s.id,
            type: s.type as any,
            vertexIds: s.vertexRefs,
            style: {
                color: s.style.color || "#000000",
                strokeWidth: s.style.strokeWidth || 2,
                fill: s.style.fill,
                opacity: s.style.opacity ?? 1,
            },
            visible: s.style.visible ?? true,
            locked: s.style.locked ?? false,
            metadata: s.properties.metadata,
        };
        
        let shape: Shape;
        
        switch (s.type) {
            case "line":
                shape = {
                    ...baseShape,
                    type: "line",
                    vertexIds: s.vertexRefs as [string, string],
                } as any;
                break;
                
            case "rect":
                shape = {
                    ...baseShape,
                    type: "rect",
                    vertexIds: s.vertexRefs as [string, string, string, string],
                } as any;
                break;
                
            case "circle":
                const radius = s.properties.radius || 50;
                shape = {
                    ...baseShape,
                    type: "circle",
                    vertexIds: [s.vertexRefs[0]],
                    radius: usesGridUnits ? radius * importGridSize : radius,
                } as any;
                break;
                
            case "bezier":
                shape = {
                    ...baseShape,
                    type: "bezier",
                    segments: s.properties.segments || [],
                    closed: s.properties.closed || false,
                    vertexIds: s.vertexRefs,
                } as any;
                break;
                
            case "polygon":
                shape = {
                    ...baseShape,
                    type: "polygon",
                    vertexIds: s.vertexRefs,
                    closed: s.properties.closed ?? true,
                } as any;
                break;
                
            default:
                console.warn(`Unknown shape type: ${s.type}`);
                return;
        }
        
        shapes.set(shape.id, shape);
    });
    
    importData.groups.forEach(g => {
        groups.set(g.id, {
            id: g.id,
            name: g.name,
            shapeIds: g.shapeRefs,
            locked: false,
        });
    });
    
    if (importData.frames) {
        importData.frames.forEach(f => {
            const vertexPositions = new Map<string, { x: number; y: number }>();
            const shapeProperties = new Map<string, { radius?: number }>();
            
            f.vertexPositions.forEach(vp => {
                const [x, y] = fromGridUnits(vp.position[0], vp.position[1]);
                vertexPositions.set(vp.vertexId, { x, y });
            });
            
            if (f.shapeProperties) {
                f.shapeProperties.forEach(sp => {
                    const props = { ...sp.properties };
                    if (props.radius !== undefined && usesGridUnits) {
                        props.radius = props.radius * importGridSize;
                    }
                    shapeProperties.set(sp.shapeId, props);
                });
            }
            
            frames.push({
                id: f.id,
                name: f.name,
                timestamp: f.timestamp,
                vertices: vertexPositions,
                shapeProperties,
            });
        });
    }
    
    return { vertices, shapes, groups, frames };
};