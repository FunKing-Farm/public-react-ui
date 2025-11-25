import { type MeshData, type ProcessedMesh, type KeyFrame, type MeshShape } from './types';

export class MeshLoader {
    private meshData: MeshData | null = null;
    private baseVertexMap: Map<string, [number, number]> = new Map();
    private gridSize: number = 20;
    
    loadMeshData(data: MeshData): void {
        this.meshData = data;
        this.gridSize = data.metadata.coordinateSystem.gridSize || 20;
        this.updateBaseVertexMap();
    }
    
    private updateBaseVertexMap(): void {
        if (!this.meshData) return;
        
        this.baseVertexMap.clear();
        this.meshData.vertices.forEach(vertex => {
            this.baseVertexMap.set(vertex.id, vertex.position);
        });
    }
    
    private getVertexPositions(frameIndex: number | null): Map<string, [number, number]> {
        const positions = new Map<string, [number, number]>();
        
        // Start with base vertex positions
        this.baseVertexMap.forEach((pos, id) => {
            positions.set(id, [...pos] as [number, number]);
        });
        
        // Override with frame-specific positions if frame exists
        if (frameIndex !== null && this.meshData?.frames && frameIndex < this.meshData.frames.length) {
            const frame = this.meshData.frames[frameIndex];
            frame.vertexPositions.forEach(vp => {
                positions.set(vp.vertexId, vp.position);
            });
        }
        
        return positions;
    }
    
    private getShapeProperties(shapeId: string, frameIndex: number | null): any {
        if (frameIndex === null || !this.meshData?.frames || frameIndex >= this.meshData.frames.length) {
            return {};
        }
        
        const frame = this.meshData.frames[frameIndex];
        const shapeProps = frame.shapeProperties?.find(sp => sp.shapeId === shapeId);
        return shapeProps?.properties || {};
    }
    
    private evaluateBezier(
        t: number,
        p0: [number, number],
        p1: [number, number],
        p2: [number, number],
        p3: [number, number]
    ): [number, number] {
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        
        const x = mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0];
        const y = mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1];
        
        return [x, y];
    }
    
    private tessellateBezierSegment(
        segment: any,
        vertexPositions: Map<string, [number, number]>,
        resolution: number = 20
    ): Array<[number, number]> {
        const points: Array<[number, number]> = [];
        
        const p0 = vertexPositions.get(segment.p0);
        const p1 = vertexPositions.get(segment.p1);
        const p2 = vertexPositions.get(segment.p2);
        const p3 = vertexPositions.get(segment.p3);
        
        if (!p0 || !p1 || !p2 || !p3) return points;
        
        for (let i = 0; i <= resolution; i++) {
            const t = i / resolution;
            points.push(this.evaluateBezier(t, p0, p1, p2, p3));
        }
        
        return points;
    }
    
    private tessellateCircle(
        center: [number, number],
        radius: number,
        segments: number = 32
    ): Array<[number, number]> {
        const points: Array<[number, number]> = [];
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push([
                center[0] + Math.cos(angle) * radius,
                center[1] + Math.sin(angle) * radius
            ]);
        }
        
        return points;
    }
    
    private processShape(
        shape: MeshShape,
        vertexPositions: Map<string, [number, number]>,
        frameIndex: number | null
    ): Array<[number, number]> {
        const points: Array<[number, number]> = [];
        
        switch (shape.type) {
            case 'line': {
                // Line requires exactly 2 vertices
                if (shape.vertexRefs.length !== 2) break;
                const p0 = vertexPositions.get(shape.vertexRefs[0]);
                const p1 = vertexPositions.get(shape.vertexRefs[1]);
                if (p0 && p1) {
                    points.push(p0, p1);
                }
                break;
            }
            
            case 'rect': {
                // Rectangle requires exactly 4 vertices (top-left, top-right, bottom-right, bottom-left)
                if (shape.vertexRefs.length !== 4) break;
                shape.vertexRefs.forEach(ref => {
                    const pos = vertexPositions.get(ref);
                    if (pos) points.push(pos);
                });
                // Close the rectangle
                const firstPos = vertexPositions.get(shape.vertexRefs[0]);
                if (firstPos) points.push(firstPos);
                break;
            }
            
            case 'circle': {
                // Circle requires 1 vertex (center) and radius property
                if (shape.vertexRefs.length !== 1) break;
                const center = vertexPositions.get(shape.vertexRefs[0]);
                if (!center) break;
                
                // Get radius from frame properties or base properties
                const frameProps = this.getShapeProperties(shape.id, frameIndex);
                const radius = frameProps.radius ?? shape.properties.radius ?? 1;
                
                const segments = this.meshData?.metadata.renderingHints?.recommendedTessellation?.circleSegments || 32;
                points.push(...this.tessellateCircle(center, radius, segments));
                break;
            }
            
            case 'polygon': {
                // Polygon requires minimum 3 vertices
                if (shape.vertexRefs.length < 3) break;
                shape.vertexRefs.forEach(ref => {
                    const pos = vertexPositions.get(ref);
                    if (pos) points.push(pos);
                });
                // Close the polygon if specified
                if (shape.properties.closed) {
                    const firstPos = vertexPositions.get(shape.vertexRefs[0]);
                    if (firstPos) points.push(firstPos);
                }
                break;
            }
            
            case 'bezier': {
                // Bezier curves use segments array
                if (!shape.properties.segments) break;
                
                const resolution = this.meshData?.metadata.renderingHints?.recommendedTessellation?.bezierSegments || 20;
                
                shape.properties.segments.forEach((segment, index) => {
                    const segmentPoints = this.tessellateBezierSegment(segment, vertexPositions, resolution);
                    // Avoid duplicating connection points between segments
                    if (points.length > 0 && segmentPoints.length > 0) {
                        segmentPoints.shift();
                    }
                    points.push(...segmentPoints);
                });
                break;
            }
        }
        
        return points;
    }
    
    processFrame(frameIndex: number | null = null): ProcessedMesh | null {
        if (!this.meshData) return null;
        
        const vertexPositions = this.getVertexPositions(frameIndex);
        
        const allPoints: Array<[number, number]> = [];
        const allColors: Array<[number, number, number]> = [];
        const allIndices: number[] = [];
        
        // Process each visible shape
        this.meshData.shapes.forEach(shape => {
            if (!shape.style.visible) return;
            
            const shapePoints = this.processShape(shape, vertexPositions, frameIndex);
            if (shapePoints.length < 2) return;
            
            const color = this.hexToRgb(shape.style.color);
            const fillColor = shape.style.fill ? this.hexToRgb(shape.style.fill) : null;
            const strokeWidth = shape.style.strokeWidth / 100; // Scale to normalized coordinates
            
            // Render fill if specified (for closed shapes)
            if (fillColor && (shape.type === 'rect' || shape.type === 'circle' || 
                             shape.type === 'polygon' || (shape.type === 'bezier' && shape.properties.closed))) {
                this.addFilledShape(shapePoints, fillColor, allPoints, allColors, allIndices);
            }
            
            // Render stroke
            if (shape.style.strokeWidth > 0) {
                this.addStrokedShape(shapePoints, color, strokeWidth, allPoints, allColors, allIndices);
            }
        });
        
        if (allPoints.length === 0) {
            return {
                vertices: new Float32Array(0),
                colors: new Float32Array(0),
                indices: new Uint16Array(0),
                vertexCount: 0,
                indexCount: 0
            };
        }
        
        // Normalize coordinates to screen space
        const bounds = this.meshData.metadata.boundingBox;
        const maxDim = Math.max(bounds.width, bounds.height);
        
        const vertices = new Float32Array(allPoints.length * 2);
        const colors = new Float32Array(allColors.length * 3);
        
        allPoints.forEach((point, i) => {
            // Center and scale to fit in [-0.8, 0.8] range
            vertices[i * 2] = ((point[0] - bounds.width / 2) / maxDim) * 1.6;
            vertices[i * 2 + 1] = -((point[1] - bounds.height / 2) / maxDim) * 1.6; // Flip Y for screen space
        });
        
        allColors.forEach((color, i) => {
            colors[i * 3] = color[0];
            colors[i * 3 + 1] = color[1];
            colors[i * 3 + 2] = color[2];
        });
        
        return {
            vertices,
            colors,
            indices: new Uint16Array(allIndices),
            vertexCount: allPoints.length,
            indexCount: allIndices.length
        };
    }
    
    private addFilledShape(
        points: Array<[number, number]>,
        color: [number, number, number],
        allPoints: Array<[number, number]>,
        allColors: Array<[number, number, number]>,
        allIndices: number[]
    ): void {
        if (points.length < 3) return;
        
        const baseIndex = allPoints.length;
        
        // Simple fan triangulation from first point
        allPoints.push(...points);
        for (let i = 0; i < points.length; i++) {
            allColors.push(color);
        }
        
        // Create triangle fan
        for (let i = 1; i < points.length - 1; i++) {
            allIndices.push(baseIndex, baseIndex + i, baseIndex + i + 1);
        }
    }
    
    private addStrokedShape(
        points: Array<[number, number]>,
        color: [number, number, number],
        thickness: number,
        allPoints: Array<[number, number]>,
        allColors: Array<[number, number, number]>,
        allIndices: number[]
    ): void {
        if (points.length < 2) return;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Calculate perpendicular vector for thickness
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const len = Math.sqrt(dx * dx + dy * dy);
            
            if (len === 0) continue;
            
            const perpX = -dy / len * thickness;
            const perpY = dx / len * thickness;
            
            const baseIndex = allPoints.length;
            
            // Add quad vertices for line segment
            allPoints.push(
                [p1[0] - perpX, p1[1] - perpY],
                [p1[0] + perpX, p1[1] + perpY],
                [p2[0] - perpX, p2[1] - perpY],
                [p2[0] + perpX, p2[1] + perpY]
            );
            
            // Add colors for all 4 vertices
            for (let j = 0; j < 4; j++) {
                allColors.push(color);
            }
            
            // Add two triangles for the quad
            allIndices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex + 1, baseIndex + 3, baseIndex + 2
            );
        }
    }
    
    interpolateFrames(frameIndex1: number, frameIndex2: number, t: number): ProcessedMesh | null {
        if (!this.meshData?.frames || frameIndex1 >= this.meshData.frames.length || 
            frameIndex2 >= this.meshData.frames.length) return null;
        
        const frame1 = this.meshData.frames[frameIndex1];
        const frame2 = this.meshData.frames[frameIndex2];
        
        const vertexPositions = new Map<string, [number, number]>();
        
        // Start with base positions
        this.baseVertexMap.forEach((pos, id) => {
            vertexPositions.set(id, [...pos] as [number, number]);
        });
        
        // Get frame1 positions
        const frame1Positions = new Map<string, [number, number]>();
        frame1.vertexPositions.forEach(vp => {
            frame1Positions.set(vp.vertexId, vp.position);
        });
        
        // Interpolate with frame2 positions
        frame2.vertexPositions.forEach(vp2 => {
            const vp1 = frame1Positions.get(vp2.vertexId);
            if (vp1) {
                const x = vp1[0] * (1 - t) + vp2.position[0] * t;
                const y = vp1[1] * (1 - t) + vp2.position[1] * t;
                vertexPositions.set(vp2.vertexId, [x, y]);
            } else {
                vertexPositions.set(vp2.vertexId, vp2.position);
            }
        });
        
        // Apply frame1 positions for vertices not in frame2
        frame1Positions.forEach((pos, id) => {
            if (!vertexPositions.has(id)) {
                vertexPositions.set(id, pos);
            }
        });
        
        // Process shapes with interpolated positions
        const allPoints: Array<[number, number]> = [];
        const allColors: Array<[number, number, number]> = [];
        const allIndices: number[] = [];
        
        this.meshData.shapes.forEach(shape => {
            if (!shape.style.visible) return;
            
            // For now, use frame1 for shape properties (could interpolate these too)
            const shapePoints = this.processShape(shape, vertexPositions, frameIndex1);
            if (shapePoints.length < 2) return;
            
            const color = this.hexToRgb(shape.style.color);
            const fillColor = shape.style.fill ? this.hexToRgb(shape.style.fill) : null;
            const strokeWidth = shape.style.strokeWidth / 100;
            
            if (fillColor && (shape.type === 'rect' || shape.type === 'circle' || 
                             shape.type === 'polygon' || (shape.type === 'bezier' && shape.properties.closed))) {
                this.addFilledShape(shapePoints, fillColor, allPoints, allColors, allIndices);
            }
            
            if (shape.style.strokeWidth > 0) {
                this.addStrokedShape(shapePoints, color, strokeWidth, allPoints, allColors, allIndices);
            }
        });
        
        if (allPoints.length === 0) {
            return {
                vertices: new Float32Array(0),
                colors: new Float32Array(0),
                indices: new Uint16Array(0),
                vertexCount: 0,
                indexCount: 0
            };
        }
        
        const bounds = this.meshData.metadata.boundingBox;
        const maxDim = Math.max(bounds.width, bounds.height);
        
        const vertices = new Float32Array(allPoints.length * 2);
        const colors = new Float32Array(allColors.length * 3);
        
        allPoints.forEach((point, i) => {
            vertices[i * 2] = ((point[0] - bounds.width / 2) / maxDim) * 1.6;
            vertices[i * 2 + 1] = -((point[1] - bounds.height / 2) / maxDim) * 1.6;
        });
        
        allColors.forEach((color, i) => {
            colors[i * 3] = color[0];
            colors[i * 3 + 1] = color[1];
            colors[i * 3 + 2] = color[2];
        });
        
        return {
            vertices,
            colors,
            indices: new Uint16Array(allIndices),
            vertexCount: allPoints.length,
            indexCount: allIndices.length
        };
    }
    
    private hexToRgb(hex: string): [number, number, number] {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [0, 0, 0];
    }
    
    getFrameCount(): number {
        return this.meshData?.frames?.length || 0;
    }
    
    getFrames(): KeyFrame[] {
        return this.meshData?.frames || [];
    }
    
    hasFrames(): boolean {
        return (this.meshData?.frames?.length || 0) > 0;
    }
}