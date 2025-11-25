export class Camera {
    private position: [number, number] = [0, 0];
    private zoom: number = 1.0;
    private minZoom: number = 0.1;
    private maxZoom: number = 10.0;
    
    // Viewport dimensions
    private viewportWidth: number;
    private viewportHeight: number;
    
    constructor(viewportWidth: number, viewportHeight: number) {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
    }
    
    setViewportSize(width: number, height: number): void {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }
    
    getPosition(): [number, number] {
        return [this.position[0], this.position[1]];
    }
    
    setPosition(x: number, y: number): void {
        this.position = [x, y];
    }
    
    translate(dx: number, dy: number): void {
        this.position[0] += dx;
        this.position[1] += dy;
    }
    
    getZoom(): number {
        return this.zoom;
    }
    
    setZoom(zoom: number): void {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }
    
    adjustZoom(delta: number, focusX?: number, focusY?: number): void {
        const oldZoom = this.zoom;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * (1 + delta)));
        
        // Zoom towards a focus point (for mouse wheel zoom)
        if (focusX !== undefined && focusY !== undefined) {
            const worldFocus = this.screenToWorld(focusX, focusY);
            this.zoom = newZoom;
            const newScreenFocus = this.worldToScreen(worldFocus[0], worldFocus[1]);
            
            // Adjust camera position to keep focus point stationary
            const screenDx = focusX - newScreenFocus[0];
            const screenDy = focusY - newScreenFocus[1];
            this.position[0] += screenDx / this.viewportWidth * 2;
            this.position[1] -= screenDy / this.viewportHeight * 2;
        } else {
            this.zoom = newZoom;
        }
    }
    
    // Convert screen coordinates to world coordinates
    screenToWorld(screenX: number, screenY: number): [number, number] {
        const aspectRatio = this.viewportWidth / this.viewportHeight;
        
        // Normalize screen coordinates to [-1, 1]
        const ndcX = (screenX / this.viewportWidth) * 2 - 1;
        const ndcY = -((screenY / this.viewportHeight) * 2 - 1);
        
        // Apply camera transform
        const worldX = (ndcX / this.zoom) * aspectRatio + this.position[0];
        const worldY = (ndcY / this.zoom) + this.position[1];
        
        return [worldX, worldY];
    }
    
    // Convert world coordinates to screen coordinates
    worldToScreen(worldX: number, worldY: number): [number, number] {
        const aspectRatio = this.viewportWidth / this.viewportHeight;
        
        // Apply camera transform
        const ndcX = ((worldX - this.position[0]) * this.zoom) / aspectRatio;
        const ndcY = (worldY - this.position[1]) * this.zoom;
        
        // Convert to screen coordinates
        const screenX = (ndcX + 1) * 0.5 * this.viewportWidth;
        const screenY = (-ndcY + 1) * 0.5 * this.viewportHeight;
        
        return [screenX, screenY];
    }
    
    // Get the world-space bounds visible in the viewport
    getVisibleBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.viewportWidth, this.viewportHeight);
        
        return {
            minX: topLeft[0],
            maxX: bottomRight[0],
            minY: bottomRight[1],
            maxY: topLeft[1]
        };
    }
    
    // Reset camera to default state
    reset(): void {
        this.position = [0, 0];
        this.zoom = 1.0;
    }
    
    // Get view matrix components for shader
    getViewTransform() {
        return {
            position: this.position,
            zoom: this.zoom
        };
    }
}