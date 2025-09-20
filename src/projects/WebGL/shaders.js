// shaders.js
export const SHADERS = {
    basic: {
        vertex: `
      attribute vec2 a_position;
      uniform vec2 u_resolution;
      uniform vec2 u_translation;
      uniform float u_rotation;
      uniform vec2 u_scale;
      
      void main() {
        // Apply transformations
        float c = cos(u_rotation);
        float s = sin(u_rotation);
        mat2 rotationMatrix = mat2(c, -s, s, c);
        
        vec2 scaledPosition = a_position * u_scale;
        vec2 rotatedPosition = rotationMatrix * scaledPosition;
        vec2 position = rotatedPosition + u_translation;
        
        // Convert to clip space
        vec2 zeroToOne = position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      }
    `,
        fragment: `
      precision mediump float;
      uniform vec4 u_color;
      
      void main() {
        gl_FragColor = u_color;
      }
    `
    },

    gradient: {
        vertex: `
      attribute vec2 a_position;
      attribute vec4 a_color;
      uniform vec2 u_resolution;
      uniform vec2 u_translation;
      varying vec4 v_color;
      
      void main() {
        vec2 position = a_position + u_translation;
        vec2 zeroToOne = position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_color = a_color;
      }
    `,
        fragment: `
      precision mediump float;
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `
    },

    wave: {
        vertex: `
      precision mediump float;
      attribute vec2 a_position;
      uniform vec2 u_resolution;
      uniform vec2 u_translation;
      uniform float u_time;
      uniform float u_amplitude;
      uniform float u_frequency;
      
      void main() {
        vec2 position = a_position;
        position.y += sin(position.x * u_frequency + u_time) * u_amplitude;
        position += u_translation;
        
        vec2 zeroToOne = position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      }
    `,
        fragment: `
      precision mediump float;
      uniform vec4 u_color;
      uniform float u_time;
      
      void main() {
        vec3 color = u_color.rgb;
        color.b += sin(u_time) * 0.3;
        gl_FragColor = vec4(color, u_color.a);
      }
    `
    }
};