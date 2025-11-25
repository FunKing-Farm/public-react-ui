export const vertexShaderCode = /* wgsl */ `
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f,
}

struct Uniforms {
    instancePos: vec2f,      // offset 0, size 8
    rotation: f32,           // offset 8, size 4
    aspect: f32,             // offset 12, size 4
    instanceScale: vec2f,    // offset 16, size 8
    opacity: f32,            // offset 24, size 4
    pad1: f32,               // offset 28, size 4
    colorTint: vec3f,        // offset 32, size 12
    pad2: f32,               // offset 44, size 4
    cameraPos: vec2f,        // offset 48, size 8
    cameraZoom: f32,         // offset 56, size 4
    pad3: f32,               // offset 60, size 4
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(@location(0) position: vec2f, @location(1) color: vec3f) -> VertexOutput {
    var output: VertexOutput;
    
    // Apply instance scale
    var scaledPos = position * uniforms.instanceScale;
    
    // Apply instance rotation
    let cosR = cos(uniforms.rotation);
    let sinR = sin(uniforms.rotation);
    let rotatedPos = vec2f(
        scaledPos.x * cosR - scaledPos.y * sinR,
        scaledPos.x * sinR + scaledPos.y * cosR
    );
    
    // Apply instance translation (world position)
    let worldPos = rotatedPos + uniforms.instancePos;
    
    // Apply camera transformation
    let viewPos = (worldPos - uniforms.cameraPos) * uniforms.cameraZoom;
    
    // Apply aspect ratio correction
    output.position = vec4f(viewPos.x / uniforms.aspect, viewPos.y, 0.0, 1.0);
    
    // Apply color tint
    output.color = color * uniforms.colorTint;
    
    return output;
}
`;

export const fragmentShaderCode = /* wgsl */ `
struct Uniforms {
    instancePos: vec2f,
    rotation: f32,
    aspect: f32,
    instanceScale: vec2f,
    opacity: f32,
    pad1: f32,
    colorTint: vec3f,
    pad2: f32,
    cameraPos: vec2f,
    cameraZoom: f32,
    pad3: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fragmentMain(@location(0) color: vec3f) -> @location(0) vec4f {
    return vec4f(color, uniforms.opacity);
}
`;