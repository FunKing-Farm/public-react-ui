import { type MeshData, type KeyFrame, type MeshShape, type MeshVertex } from './types';

/**
 * Represents a loaded mesh as a reusable template/definition
 */
export class MeshDefinition {
    public readonly id: string;
    public readonly name: string;
    public readonly data: MeshData;
    
    private vertexMap: Map<string, [number, number]> = new Map();
    private frameMap: Map<string, number> = new Map();
    
    constructor(data: MeshData, name: string = 'Unnamed') {
        this.id = crypto.randomUUID();
        this.name = name;
        this.data = data;
        
        this.buildVertexMap();
        this.buildFrameMap();
    }
    
    private buildVertexMap(): void {
        this.data.vertices.forEach(vertex => {
            this.vertexMap.set(vertex.id, vertex.position);
        });
    }
    
    private buildFrameMap(): void {
        this.data.frames?.forEach((frame, index) => {
            this.frameMap.set(frame.id, index);
            this.frameMap.set(frame.name, index);
        });
    }
    
    getVertexPosition(vertexId: string): [number, number] | undefined {
        return this.vertexMap.get(vertexId);
    }
    
    getFrameCount(): number {
        return this.data.frames?.length || 0;
    }
    
    getFrame(index: number): KeyFrame | undefined {
        return this.data.frames?.[index];
    }
    
    getFrameByName(name: string): KeyFrame | undefined {
        const index = this.frameMap.get(name);
        return index !== undefined ? this.data.frames?.[index] : undefined;
    }
    
    getFrameIndex(nameOrId: string): number {
        return this.frameMap.get(nameOrId) ?? -1;
    }
    
    getFrameNames(): string[] {
        return this.data.frames?.map(f => f.name || f.id) || [];
    }
    
    getBoundingBox() {
        return this.data.metadata.boundingBox;
    }
    
    getGridSize(): number {
        return this.data.metadata.coordinateSystem.gridSize;
    }
}

/**
 * Registry for managing loaded mesh definitions
 */
export class MeshDefinitionRegistry {
    private definitions: Map<string, MeshDefinition> = new Map();
    private definitionsByName: Map<string, MeshDefinition> = new Map();
    
    register(data: MeshData, name?: string): MeshDefinition {
        const fileName = name || `mesh_${this.definitions.size}`;
        const definition = new MeshDefinition(data, fileName);
        
        this.definitions.set(definition.id, definition);
        this.definitionsByName.set(definition.name, definition);
        
        return definition;
    }
    
    unregister(id: string): boolean {
        const definition = this.definitions.get(id);
        if (!definition) return false;
        
        this.definitions.delete(id);
        this.definitionsByName.delete(definition.name);
        return true;
    }
    
    get(id: string): MeshDefinition | undefined {
        return this.definitions.get(id);
    }
    
    getByName(name: string): MeshDefinition | undefined {
        return this.definitionsByName.get(name);
    }
    
    getAll(): MeshDefinition[] {
        return Array.from(this.definitions.values());
    }
    
    clear(): void {
        this.definitions.clear();
        this.definitionsByName.clear();
    }
}