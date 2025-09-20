// drawableObjects.js
import { SHADERS } from './shaders';

export class DrawableObject {
  constructor(id, options = {}) {
    this.id = id;
    this.visible = options.visible !== undefined ? options.visible : true;
    this.shaderId = options.shaderId || 'basic';
    this.vertexShader = options.vertexShader || SHADERS.basic.vertex;
    this.fragmentShader = options.fragmentShader || SHADERS.basic.fragment;
    this.drawMode = options.drawMode;
    this.vertices = [];
    this.attributes = options.attributes || { a_position: { size: 2 } };
    this.uniforms = options.uniforms || {};
  }

  update(deltaTime) {
    // Override in subclasses
  }
}

export class Circle extends DrawableObject {
  constructor(id, x, y, radius, color, segments = 30) {
    super(id, {
      shaderId: 'basic',
      uniforms: {
        u_translation: [x, y],
        u_rotation: 0,
        u_scale: [1, 1],
        u_color: color
      }
    });
    
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.segments = segments;
    this.drawMode = 0x0006; // gl.TRIANGLE_FAN
    
    this.generateVertices();
  }

  generateVertices() {
    this.vertices = [0, 0]; // Center
    
    for (let i = 0; i <= this.segments; i++) {
      const angle = (i / this.segments) * Math.PI * 2;
      this.vertices.push(
        Math.cos(angle) * this.radius,
        Math.sin(angle) * this.radius
      );
    }
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.uniforms.u_translation = [x, y];
  }

  setScale(scale) {
    this.uniforms.u_scale = [scale, scale];
  }

  setRotation(rotation) {
    this.uniforms.u_rotation = rotation;
  }
}

export class Rectangle extends DrawableObject {
  constructor(id, x, y, width, height, color) {
    super(id, {
      shaderId: 'basic',
      uniforms: {
        u_translation: [x, y],
        u_rotation: 0,
        u_scale: [1, 1],
        u_color: color
      }
    });
    
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    
    this.generateVertices();
  }

  generateVertices() {
    const hw = this.width / 2;
    const hh = this.height / 2;
    
    this.vertices = [
      -hw, -hh,
      hw, -hh,
      -hw, hh,
      -hw, hh,
      hw, -hh,
      hw, hh
    ];
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.uniforms.u_translation = [x, y];
  }
}

export class GradientTriangle extends DrawableObject {
  constructor(id, points, colors) {
    super(id, {
      shaderId: 'gradient',
      vertexShader: SHADERS.gradient.vertex,
      fragmentShader: SHADERS.gradient.fragment,
      attributes: {
        a_position: { size: 2, stride: 24, offset: 0 },
        a_color: { size: 4, stride: 24, offset: 8 }
      },
      uniforms: {
        u_translation: [0, 0]
      }
    });
    
    this.points = points;
    this.colors = colors;
    this.vertexSize = 6; // 2 for position + 4 for color
    
    this.generateVertices();
  }

  generateVertices() {
    this.vertices = [];
    
    for (let i = 0; i < 3; i++) {
      this.vertices.push(
        this.points[i][0], this.points[i][1],
        ...this.colors[i]
      );
    }
  }
}

export class WavyLine extends DrawableObject {
  constructor(id, startX, y, width, color, segments = 100) {
    super(id, {
      shaderId: 'wave',
      vertexShader: SHADERS.wave.vertex,
      fragmentShader: SHADERS.wave.fragment,
      uniforms: {
        u_translation: [0, 0],
        u_color: color,
        u_amplitude: 20,
        u_frequency: 0.02
      }
    });
    
    this.startX = startX;
    this.y = y;
    this.width = width;
    this.segments = segments;
    this.drawMode = 0x0003; // gl.LINE_STRIP
    
    this.generateVertices();
  }

  generateVertices() {
    this.vertices = [];
    
    for (let i = 0; i <= this.segments; i++) {
      const x = this.startX + (i / this.segments) * this.width;
      this.vertices.push(x, this.y);
    }
  }

  setAmplitude(amplitude) {
    this.uniforms.u_amplitude = amplitude;
  }

  setFrequency(frequency) {
    this.uniforms.u_frequency = frequency;
  }
}