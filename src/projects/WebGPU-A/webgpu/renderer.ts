import { vertexShaderCode, fragmentShaderCode } from './shaders';
import { MeshLoader } from './meshLoader';
import { type MeshDefinition, MeshDefinitionRegistry } from './meshDefinition';
import { type MeshInstance, InstanceManager } from './meshInstance';
import { type MeshData, type ProcessedMesh } from './types';
import { Camera } from './camera';

export class WebGPURenderer {
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private pipeline: GPURenderPipeline | null = null;
    private animationId: number | null = null;
    
    private meshLoader: MeshLoader;
    private canvas: HTMLCanvasElement | null = null;
    
    // Camera system
    public camera: Camera;
    
    // Instance-based rendering
    public definitionRegistry: MeshDefinitionRegistry;
    public instanceManager: InstanceManager;
    
    // GPU buffers per instance (cached)
    private instanceBuffers: Map<string, {
        vertexBuffer: GPUBuffer;
        colorBuffer: GPUBuffer;
        indexBuffer: GPUBuffer;
        uniformBuffer: GPUBuffer;
        bindGroup: GPUBindGroup;
        mesh: ProcessedMesh;
        frameIndex: number;
    }> = new Map();
    
    constructor() {
        this.meshLoader = new MeshLoader();
        this.definitionRegistry = new MeshDefinitionRegistry();
        this.instanceManager = new InstanceManager();
        this.camera = new Camera(800, 600); // Default size, updated on init
    }
    
    async initialize(canvas: HTMLCanvasElement): Promise<void> {
        this.canvas = canvas;
        this.camera.setViewportSize(canvas.width, canvas.height);
        
        if (!navigator.gpu) {
            throw new Error('WebGPU is not supported in this browser');
        }
        
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error('Failed to get GPU adapter');
        }
        
        this.device = await adapter.requestDevice();
        
        this.context = canvas.getContext('webgpu');
        if (!this.context) {
            throw new Error('Failed to get WebGPU context');
        }
        
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: presentationFormat,
        });
        
        await this.setupPipeline(presentationFormat);
        this.setupInputHandlers();
        console.log('WebGPU initialized successfully');
    }
    
    private setupInputHandlers(): void {
        if (!this.canvas) return;
        
        let isPanning = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            const rect = this.canvas!.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            this.camera.adjustZoom(delta, mouseX, mouseY);
        });
        
        // Mouse pan
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                isPanning = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                this.canvas!.style.cursor = 'grabbing';
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const dx = e.clientX - lastMouseX;
                const dy = e.clientY - lastMouseY;
                
                // Convert screen delta to world delta
                const worldDx = -dx / this.canvas!.width * 2 / this.camera.getZoom();
                const worldDy = dy / this.canvas!.height * 2 / this.camera.getZoom();
                
                this.camera.translate(worldDx, worldDy);
                
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                isPanning = false;
                this.canvas!.style.cursor = 'grab';
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            isPanning = false;
            this.canvas!.style.cursor = 'default';
        });
        
        // Set initial cursor
        this.canvas.style.cursor = 'grab';
    }
    
    private async setupPipeline(format: GPUTextureFormat): Promise<void> {
        if (!this.device || !this.canvas) return;
        
        const vertexShaderModule = this.device.createShaderModule({
            label: 'Vertex Shader',
            code: vertexShaderCode
        });
        
        const fragmentShaderModule = this.device.createShaderModule({
            label: 'Fragment Shader',
            code: fragmentShaderCode
        });
        
        const bindGroupLayout = this.device.createBindGroupLayout({
            label: 'Bind Group Layout',
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' }
            }]
        });
        
        this.pipeline = this.device.createRenderPipeline({
            label: 'Render Pipeline',
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            }),
            vertex: {
                module: vertexShaderModule,
                entryPoint: 'vertexMain',
                buffers: [
                    {
                        arrayStride: 2 * 4,
                        attributes: [{
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x2'
                        }]
                    },
                    {
                        arrayStride: 3 * 4,
                        attributes: [{
                            shaderLocation: 1,
                            offset: 0,
                            format: 'float32x3'
                        }]
                    }
                ]
            },
            fragment: {
                module: fragmentShaderModule,
                entryPoint: 'fragmentMain',
                targets: [{
                    format: format,
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        }
                    }
                }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none'
            }
        });
    }
    
    loadMeshDefinition(meshData: MeshData, name?: string): MeshDefinition {
        const definition = this.definitionRegistry.register(meshData, name);
        console.log(`Loaded mesh definition: ${definition.name}`, {
            frames: definition.getFrameCount(),
            shapes: meshData.shapes.length,
            vertices: meshData.vertices.length
        });
        return definition;
    }
    
    private getOrCreateInstanceBuffers(instance: MeshInstance): any {
        const currentFrameIndex = instance.getCurrentFrameIndex();
        let buffers = this.instanceBuffers.get(instance.id);
        
        const needsUpdate = !buffers || buffers.frameIndex !== currentFrameIndex;
        
        if (needsUpdate) {
            if (buffers) {
                buffers.vertexBuffer.destroy();
                buffers.colorBuffer.destroy();
                buffers.indexBuffer.destroy();
                buffers.uniformBuffer.destroy();
            }
            
            this.meshLoader.loadMeshData(instance.definition.data);
            
            let frameToProcess: number | null = null;
            if (instance.definition.getFrameCount() > 0) {
                frameToProcess = currentFrameIndex >= 0 ? currentFrameIndex : 0;
            }
            
            const mesh = this.meshLoader.processFrame(frameToProcess);
            
            if (!mesh || !this.device || mesh.vertexCount === 0) {
                console.warn(`Failed to process mesh for instance ${instance.name}`);
                return null;
            }
            
            const vertexBuffer = this.device.createBuffer({
                label: `Vertex Buffer - ${instance.id}`,
                size: Math.max(mesh.vertices.byteLength, 256),
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            this.device.queue.writeBuffer(vertexBuffer, 0, mesh.vertices);
            
            const colorBuffer = this.device.createBuffer({
                label: `Color Buffer - ${instance.id}`,
                size: Math.max(mesh.colors.byteLength, 256),
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            this.device.queue.writeBuffer(colorBuffer, 0, mesh.colors);
            
            const indexBuffer = this.device.createBuffer({
                label: `Index Buffer - ${instance.id}`,
                size: Math.max(mesh.indices.byteLength, 256),
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            });
            this.device.queue.writeBuffer(indexBuffer, 0, mesh.indices);
            
            // Create uniform buffer (64 bytes for alignment)
            const uniformBuffer = this.device.createBuffer({
                label: `Uniform Buffer - ${instance.id}`,
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            
            const bindGroup = this.device.createBindGroup({
                label: `Bind Group - ${instance.id}`,
                layout: this.pipeline!.getBindGroupLayout(0),
                entries: [{
                    binding: 0,
                    resource: { buffer: uniformBuffer }
                }]
            });
            
            buffers = {
                vertexBuffer,
                colorBuffer,
                indexBuffer,
                uniformBuffer,
                bindGroup,
                mesh,
                frameIndex: currentFrameIndex
            };
            
            this.instanceBuffers.set(instance.id, buffers);
        }
        
        return buffers;
    }
    
    invalidateInstanceCache(instanceId: string): void {
        const buffers = this.instanceBuffers.get(instanceId);
        if (buffers) {
            buffers.vertexBuffer.destroy();
            buffers.colorBuffer.destroy();
            buffers.indexBuffer.destroy();
            buffers.uniformBuffer.destroy();
            this.instanceBuffers.delete(instanceId);
        }
    }
    
    startRenderLoop(): void {
        const render = () => {
            this.renderFrame();
            this.animationId = requestAnimationFrame(render);
        };
        render();
    }
    
    private renderFrame(): void {
        if (!this.device || !this.context || !this.pipeline || !this.canvas) {
            return;
        }
        
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();
        
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.95, g: 0.95, b: 0.95, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        
        renderPass.setPipeline(this.pipeline);
        
        // Get camera transform
        const cameraTransform = this.camera.getViewTransform();
        const aspectRatio = this.canvas.width / this.canvas.height;
        
        // Render each visible instance
        const instances = this.instanceManager.getAll();
        for (const instance of instances) {
            if (!instance.isVisible()) continue;
            
            const buffers = this.getOrCreateInstanceBuffers(instance);
            if (!buffers) continue;
            
            const transform = instance.getTransform();
            const style = instance.getStyle();
            
            // Pack uniforms with camera data
            const uniformData = new Float32Array(16);
            uniformData[0] = transform.position[0];           // instancePos.x
            uniformData[1] = transform.position[1];           // instancePos.y
            uniformData[2] = transform.rotation;              // rotation
            uniformData[3] = aspectRatio;                     // aspect
            uniformData[4] = transform.scale[0];              // instanceScale.x
            uniformData[5] = transform.scale[1];              // instanceScale.y
            uniformData[6] = style.opacity ?? 1.0;            // opacity
            uniformData[7] = 0.0;                             // pad1
            uniformData[8] = style.colorTint?.[0] ?? 1.0;     // colorTint.r
            uniformData[9] = style.colorTint?.[1] ?? 1.0;     // colorTint.g
            uniformData[10] = style.colorTint?.[2] ?? 1.0;    // colorTint.b
            uniformData[11] = 0.0;                            // pad2
            uniformData[12] = cameraTransform.position[0];    // cameraPos.x
            uniformData[13] = cameraTransform.position[1];    // cameraPos.y
            uniformData[14] = cameraTransform.zoom;           // cameraZoom
            uniformData[15] = 0.0;                            // pad3
            
            this.device.queue.writeBuffer(buffers.uniformBuffer, 0, uniformData);
            
            renderPass.setBindGroup(0, buffers.bindGroup);
            renderPass.setVertexBuffer(0, buffers.vertexBuffer);
            renderPass.setVertexBuffer(1, buffers.colorBuffer);
            renderPass.setIndexBuffer(buffers.indexBuffer, 'uint16');
            
            if (buffers.mesh.indexCount > 0) {
                renderPass.drawIndexed(buffers.mesh.indexCount);
            }
        }
        
        renderPass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
    
    cleanup(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        
        for (const [id, buffers] of this.instanceBuffers) {
            buffers.vertexBuffer.destroy();
            buffers.colorBuffer.destroy();
            buffers.indexBuffer.destroy();
            buffers.uniformBuffer.destroy();
        }
        this.instanceBuffers.clear();
    }
}

// Singleton renderer
let renderer: WebGPURenderer | null = null;

export async function initWebGPU(canvas: HTMLCanvasElement): Promise<() => void> {
    renderer = new WebGPURenderer();
    await renderer.initialize(canvas);
    renderer.startRenderLoop();
    
    return () => {
        if (renderer) {
            renderer.cleanup();
            renderer = null;
        }
    };
}

export function getRenderer(): WebGPURenderer | null {
    return renderer;
}

export function loadMeshData(data: MeshData): void {
    if (renderer) {
        const definition = renderer.loadMeshDefinition(data, 'loaded_mesh');
        renderer.instanceManager.createInstance(definition, 'default_instance', {
            position: [0, 0],
            scale: [0.5, 0.5],
            rotation: 0
        });
        console.log('Created default instance at center with scale 0.5');
    }
}

export function startRenderLoop(): void {
    if (renderer) {
        renderer.startRenderLoop();
    }
}