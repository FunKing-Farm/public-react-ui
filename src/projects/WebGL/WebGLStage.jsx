// WebGLStage.jsx
import React, { useRef, useEffect, useCallback } from 'react';

class WebGLResourceManager {
    constructor(gl) {
        this.gl = gl;
        this.shaders = new Map();
        this.programs = new Map();
        this.buffers = new Map();
        this.textures = new Map();
    }

    getOrCreateShader(id, type, source) {
        const key = `${id}_${type}`;
        if (this.shaders.has(key)) {
            return this.shaders.get(key);
        }

        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(`Shader ${id} compile error:`, this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        this.shaders.set(key, shader);
        return shader;
    }

    getOrCreateProgram(id, vertexSource, fragmentSource) {
        if (this.programs.has(id)) {
            return this.programs.get(id).program;
        }

        const vertexShader = this.getOrCreateShader(
            `${id}_vert`,
            this.gl.VERTEX_SHADER,
            vertexSource
        );
        const fragmentShader = this.getOrCreateShader(
            `${id}_frag`,
            this.gl.FRAGMENT_SHADER,
            fragmentSource
        );

        if (!vertexShader || !fragmentShader) return null;

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error(`Program ${id} link error:`, this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }

        // Cache attribute and uniform locations
        const attributes = {};
        const uniforms = {};

        const numAttributes = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const info = this.gl.getActiveAttrib(program, i);
            attributes[info.name] = this.gl.getAttribLocation(program, info.name);
        }

        const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = this.gl.getActiveUniform(program, i);
            uniforms[info.name] = this.gl.getUniformLocation(program, info.name);
        }

        this.programs.set(id, { program, attributes, uniforms });
        return program;
    }

    getProgramInfo(id) {
        return this.programs.get(id);
    }

    getOrCreateBuffer(id) {
        if (this.buffers.has(id)) {
            return this.buffers.get(id);
        }

        const buffer = this.gl.createBuffer();
        this.buffers.set(id, buffer);
        return buffer;
    }

    cleanup() {
        // Delete all shaders
        this.shaders.forEach(shader => this.gl.deleteShader(shader));
        this.shaders.clear();

        // Delete all programs
        this.programs.forEach(({ program }) => this.gl.deleteProgram(program));
        this.programs.clear();

        // Delete all buffers
        this.buffers.forEach(buffer => this.gl.deleteBuffer(buffer));
        this.buffers.clear();

        // Delete all textures
        this.textures.forEach(texture => this.gl.deleteTexture(texture));
        this.textures.clear();
    }
}

const WebGLStage = ({
    width = 800,
    height = 600,
    objects = [],
    backgroundColor = [0, 0, 0, 1],
    onInit,
    onFrame
}) => {
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const resourceManagerRef = useRef(null);
    const animationRef = useRef(null);
    const frameCountRef = useRef(0);

    // Initialize WebGL context
    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl', {
            preserveDrawingBuffer: false,
            antialias: true,
            alpha: true
        });

        if (!gl) {
            console.error('WebGL not supported');
            return;
        }

        glRef.current = gl;
        resourceManagerRef.current = new WebGLResourceManager(gl);

        // Enable common WebGL features
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Call initialization callback if provided
        if (onInit) {
            onInit(gl, resourceManagerRef.current);
        }

        return () => {
            cancelAnimationFrame(animationRef.current);
            resourceManagerRef.current?.cleanup();
            glRef.current = null;
            resourceManagerRef.current = null;
        };
    }, [onInit]);

    // Handle dimension changes
    useEffect(() => {
        const gl = glRef.current;
        if (!gl) return;

        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
    }, [width, height]);

    // Render function
    const render = useCallback((timestamp) => {
        const gl = glRef.current;
        const resourceManager = resourceManagerRef.current;

        if (!gl || !resourceManager) return;

        // Clear canvas
        gl.clearColor(...backgroundColor);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Call frame callback if provided
        if (onFrame) {
            onFrame(timestamp, frameCountRef.current);
        }

        // Group objects by shader program
        const objectsByProgram = new Map();
        objects.forEach(obj => {
            if (!obj.visible) return;

            const programId = obj.shaderId || 'default';
            if (!objectsByProgram.has(programId)) {
                objectsByProgram.set(programId, []);
            }
            objectsByProgram.get(programId).push(obj);
        });

        // Render objects grouped by shader
        objectsByProgram.forEach((objectGroup, programId) => {
            const firstObject = objectGroup[0];
            const program = resourceManager.getOrCreateProgram(
                programId,
                firstObject.vertexShader,
                firstObject.fragmentShader
            );

            if (!program) return;

            const programInfo = resourceManager.getProgramInfo(programId);
            gl.useProgram(program);

            // Set common uniforms
            if (programInfo.uniforms.u_resolution) {
                gl.uniform2f(programInfo.uniforms.u_resolution, width, height);
            }
            if (programInfo.uniforms.u_time) {
                gl.uniform1f(programInfo.uniforms.u_time, timestamp * 0.001);
            }

            // Render each object in this group
            objectGroup.forEach(obj => {
                if (obj.beforeRender) {
                    obj.beforeRender(gl, programInfo, resourceManager);
                }

                // Set object-specific uniforms
                if (obj.uniforms) {
                    Object.entries(obj.uniforms).forEach(([name, value]) => {
                        const location = programInfo.uniforms[name];
                        if (location === undefined) return;

                        if (Array.isArray(value)) {
                            switch (value.length) {
                                case 1: gl.uniform1f(location, value[0]); break;
                                case 2: gl.uniform2fv(location, value); break;
                                case 3: gl.uniform3fv(location, value); break;
                                case 4: gl.uniform4fv(location, value); break;
                            }
                        } else {
                            gl.uniform1f(location, value);
                        }
                    });
                }

                // Set up vertex data
                if (obj.vertices) {
                    const buffer = resourceManager.getOrCreateBuffer(`${obj.id}_vertices`);
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.vertices), gl.DYNAMIC_DRAW);

                    // Set up attributes
                    if (obj.attributes) {
                        Object.entries(obj.attributes).forEach(([name, config]) => {
                            const location = programInfo.attributes[name];
                            if (location === undefined || location === -1) return;

                            gl.enableVertexAttribArray(location);
                            gl.vertexAttribPointer(
                                location,
                                config.size || 2,
                                gl.FLOAT,
                                false,
                                config.stride || 0,
                                config.offset || 0
                            );
                        });
                    }

                    // Draw
                    gl.drawArrays(
                        obj.drawMode || gl.TRIANGLES,
                        0,
                        obj.vertices.length / (obj.vertexSize || 2)
                    );
                }

                if (obj.afterRender) {
                    obj.afterRender(gl, programInfo, resourceManager);
                }
            });
        });

        frameCountRef.current++;
        animationRef.current = requestAnimationFrame(render);
    }, [objects, backgroundColor, width, height, onFrame]);

    // Start animation loop
    useEffect(() => {
        if (!glRef.current) return;

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        animationRef.current = requestAnimationFrame(render);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [render]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ border: '1px solid #333' }}
        />
    );
};

export default WebGLStage;