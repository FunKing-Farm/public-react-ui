export function createStarGeometry(points: number = 5, outerRadius: number = 0.5, innerRadius: number = 0.2) {
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    
    // Center point
    vertices.push(0, 0);
    colors.push(1.0, 0.843, 0.0); // Gold color for center
    
    // Generate star points
    const angleStep = (Math.PI * 2) / (points * 2);
    
    for (let i = 0; i < points * 2; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        
        vertices.push(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius
        );
        
        // Alternate colors for visual effect
        if (i % 2 === 0) {
            colors.push(1.0, 1.0, 0.0); // Yellow for outer points
        } else {
            colors.push(1.0, 0.647, 0.0); // Orange for inner points
        }
    }
    
    // Create triangles from center to each edge
    for (let i = 0; i < points * 2; i++) {
        indices.push(0, i + 1, ((i + 1) % (points * 2)) + 1);
    }
    
    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };
}