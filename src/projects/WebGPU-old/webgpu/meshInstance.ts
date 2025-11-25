import { type MeshDefinition } from './meshDefinition';

export interface InstanceTransform {
    position: [number, number];
    rotation: number; // radians
    scale: [number, number];
}

export interface InstanceStyle {
    colorTint?: [number, number, number]; // RGB multiplier
    opacity?: number;
    visible?: boolean;
}

/**
 * Represents a single instance of a mesh definition in the world
 */
export class MeshInstance {
    public readonly id: string;
    public readonly definition: MeshDefinition;
    public name: string;
    
    // Instance state
    private currentFrameIndex: number = 0;
    private transform: InstanceTransform;
    private style: InstanceStyle;
    
    // User data for game logic
    public userData: Map<string, any> = new Map();
    
    constructor(
        definition: MeshDefinition,
        name?: string,
        initialTransform?: Partial<InstanceTransform>,
        initialStyle?: InstanceStyle
    ) {
        this.id = crypto.randomUUID();
        this.definition = definition;
        this.name = name || `${definition.name}_instance`;
        
        this.transform = {
            position: initialTransform?.position || [0, 0],
            rotation: initialTransform?.rotation || 0,
            scale: initialTransform?.scale || [1, 1]
        };
        
        this.style = {
            colorTint: initialStyle?.colorTint || [1, 1, 1],
            opacity: initialStyle?.opacity ?? 1.0,
            visible: initialStyle?.visible ?? true
        };
    }
    
    // Frame/State management
    setFrameByIndex(index: number): boolean {
        if (index < 0 || index >= this.definition.getFrameCount()) {
            return false;
        }
        this.currentFrameIndex = index;
        return true;
    }
    
    setFrameByName(name: string): boolean {
        const index = this.definition.getFrameIndex(name);
        if (index === -1) return false;
        
        this.currentFrameIndex = index;
        return true;
    }
    
    getCurrentFrameIndex(): number {
        return this.currentFrameIndex;
    }
    
    nextFrame(): void {
        const frameCount = this.definition.getFrameCount();
        if (frameCount > 0) {
            this.currentFrameIndex = (this.currentFrameIndex + 1) % frameCount;
        }
    }
    
    previousFrame(): void {
        const frameCount = this.definition.getFrameCount();
        if (frameCount > 0) {
            this.currentFrameIndex = (this.currentFrameIndex - 1 + frameCount) % frameCount;
        }
    }
    
    // Transform management
    setPosition(x: number, y: number): void {
        this.transform.position = [x, y];
    }
    
    getPosition(): [number, number] {
        return [...this.transform.position] as [number, number];
    }
    
    setRotation(radians: number): void {
        this.transform.rotation = radians;
    }
    
    getRotation(): number {
        return this.transform.rotation;
    }
    
    setScale(x: number, y: number): void {
        this.transform.scale = [x, y];
    }
    
    getScale(): [number, number] {
        return [...this.transform.scale] as [number, number];
    }
    
    getTransform(): InstanceTransform {
        return {
            position: [...this.transform.position] as [number, number],
            rotation: this.transform.rotation,
            scale: [...this.transform.scale] as [number, number]
        };
    }
    
    // Style management
    setColorTint(r: number, g: number, b: number): void {
        this.style.colorTint = [r, g, b];
    }
    
    getColorTint(): [number, number, number] {
        return this.style.colorTint || [1, 1, 1];
    }
    
    setOpacity(opacity: number): void {
        this.style.opacity = Math.max(0, Math.min(1, opacity));
    }
    
    getOpacity(): number {
        return this.style.opacity ?? 1.0;
    }
    
    setVisible(visible: boolean): void {
        this.style.visible = visible;
    }
    
    isVisible(): boolean {
        return this.style.visible ?? true;
    }
    
    getStyle(): InstanceStyle {
        return {
            colorTint: this.style.colorTint ? [...this.style.colorTint] as [number, number, number] : undefined,
            opacity: this.style.opacity,
            visible: this.style.visible
        };
    }
}

/**
 * Manages all mesh instances in the world
 */
export class InstanceManager {
    private instances: Map<string, MeshInstance> = new Map();
    private instancesByDefinition: Map<string, Set<string>> = new Map();
    
    createInstance(
        definition: MeshDefinition,
        name?: string,
        transform?: Partial<InstanceTransform>,
        style?: InstanceStyle
    ): MeshInstance {
        const instance = new MeshInstance(definition, name, transform, style);
        
        this.instances.set(instance.id, instance);
        
        // Track instances by definition
        if (!this.instancesByDefinition.has(definition.id)) {
            this.instancesByDefinition.set(definition.id, new Set());
        }
        this.instancesByDefinition.get(definition.id)!.add(instance.id);
        
        return instance;
    }
    
    removeInstance(id: string): boolean {
        const instance = this.instances.get(id);
        if (!instance) return false;
        
        // Remove from definition tracking
        const defInstances = this.instancesByDefinition.get(instance.definition.id);
        if (defInstances) {
            defInstances.delete(id);
            if (defInstances.size === 0) {
                this.instancesByDefinition.delete(instance.definition.id);
            }
        }
        
        this.instances.delete(id);
        return true;
    }
    
    getInstance(id: string): MeshInstance | undefined {
        return this.instances.get(id);
    }
    
    getAll(): MeshInstance[] {
        return Array.from(this.instances.values());
    }
    
    getInstancesByDefinition(definitionId: string): MeshInstance[] {
        const instanceIds = this.instancesByDefinition.get(definitionId);
        if (!instanceIds) return [];
        
        return Array.from(instanceIds)
            .map(id => this.instances.get(id))
            .filter(inst => inst !== undefined) as MeshInstance[];
    }
    
    clear(): void {
        this.instances.clear();
        this.instancesByDefinition.clear();
    }
    
    getCount(): number {
        return this.instances.size;
    }
}