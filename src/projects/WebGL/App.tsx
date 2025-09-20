// App.jsx
import React, { useState, useCallback, useMemo } from 'react';
import WebGLStage from './WebGLStage.jsx';
import { Circle, Rectangle, GradientTriangle, WavyLine } from './drawableObjects.js';
import './App.css';

function App() {
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [showCircles, setShowCircles] = useState(true);
    const [showRectangles, setShowRectangles] = useState(true);
    const [showGradients, setShowGradients] = useState(true);
    const [showWaves, setShowWaves] = useState(true);
    const [circleCount, setCircleCount] = useState(5);

    // Create drawable objects
    const objects = useMemo(() => {
        const objs = [];

        // Dynamic circles
        if (showCircles) {
            for (let i = 0; i < circleCount; i++) {
                const circle = new Circle(
                    `circle_${i}`,
                    100 + i * 120,
                    100,
                    30,
                    [1, 0.5, 0.2, 1]
                );
                objs.push(circle);
            }
        }

        // Rectangles
        if (showRectangles) {
            objs.push(
                new Rectangle('rect1', 200, 300, 80, 60, [0.2, 0.8, 0.3, 1]),
                new Rectangle('rect2', 400, 350, 100, 50, [0.8, 0.2, 0.8, 1])
            );
        }

        // Gradient triangles
        if (showGradients) {
            objs.push(
                new GradientTriangle(
                    'gradient1',
                    [[500, 200], [600, 200], [550, 100]],
                    [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]]
                ),
                new GradientTriangle(
                    'gradient2',
                    [[650, 250], [750, 250], [700, 150]],
                    [[1, 1, 0, 1], [0, 1, 1, 1], [1, 0, 1, 1]]
                )
            );
        }

        // Wavy lines
        if (showWaves) {
            objs.push(
                new WavyLine('wave1', 50, 450, 700, [0.2, 0.6, 1, 1]),
                new WavyLine('wave2', 50, 500, 700, [1, 0.6, 0.2, 1])
            );
        }

        return objs;
    }, [showCircles, showRectangles, showGradients, showWaves, circleCount]);

    // Animation frame callback
    const handleFrame = useCallback((timestamp, frameCount) => {
        // Animate circles
        objects.forEach((obj, index) => {
            if (obj.id.startsWith('circle_')) {
                const speed = 0.001 + index * 0.0002;
                const radius = 100 + index * 20;
                const centerX = dimensions.width / 2;
                const centerY = dimensions.height / 2;

                obj.setPosition(
                    centerX + Math.cos(timestamp * speed) * radius,
                    centerY + Math.sin(timestamp * speed) * radius
                );
                obj.setScale(1 + Math.sin(timestamp * 0.002 + index) * 0.3);
                obj.setRotation(timestamp * 0.001);
            }

            if (obj.id.startsWith('rect')) {
                obj.uniforms.u_rotation = Math.sin(timestamp * 0.0005) * 0.5;
            }

            if (obj.id.startsWith('wave')) {
                obj.uniforms.u_time = timestamp * 0.001;
                const waveIndex = parseInt(obj.id.replace('wave', ''));
                obj.setAmplitude(20 + Math.sin(timestamp * 0.0003) * 10);
                obj.setFrequency(0.02 + Math.sin(timestamp * 0.0004 + waveIndex) * 0.01);
            }
        });
    }, [objects, dimensions]);

    return (
        <div className="App">
            <h1>WebGL Stage Demo</h1>

            <div className="controls">
                <div>
                    <label>
                        Width:
                        <input
                            type="number"
                            value={dimensions.width}
                            onChange={(e) => setDimensions({
                                ...dimensions,
                                width: parseInt(e.target.value, 10)
                            })}
                            min="400"
                            max="1200"
                        />
                    </label>
                    <label>
                        Height:
                        <input
                            type="number"
                            value={dimensions.height}
                            onChange={(e) => setDimensions({
                                ...dimensions,
                                height: parseInt(e.target.value, 10)
                            })}
                            min="300"
                            max="800"
                        />
                    </label>
                </div>

                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={showCircles}
                            onChange={(e) => setShowCircles(e.target.checked)}
                        />
                        Show Circles
                    </label>
                    {showCircles && (
                        <label>
                            Circle Count:
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={circleCount}
                                onChange={(e) => setCircleCount(parseInt(e.target.value, 10))}
                            />
                            {circleCount}
                        </label>
                    )}
                </div>

                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={showRectangles}
                            onChange={(e) => setShowRectangles(e.target.checked)}
                        />
                        Show Rectangles
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={showGradients}
                            onChange={(e) => setShowGradients(e.target.checked)}
                        />
                        Show Gradients
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={showWaves}
                            onChange={(e) => setShowWaves(e.target.checked)}
                        />
                        Show Waves
                    </label>
                </div>
            </div>

            <WebGLStage
                width={dimensions.width}
                height={dimensions.height}
                objects={objects}
                backgroundColor={[0.1, 0.1, 0.1, 1]}
                onFrame={handleFrame}
            />
        </div>
    );
}

export default App;