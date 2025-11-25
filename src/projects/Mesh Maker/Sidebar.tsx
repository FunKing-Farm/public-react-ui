// Sidebar.tsx
import React from 'react';
import { type AppState, type AppAction } from './types';

interface SidebarProps {
    tool: "select" | "vertex" | "line" | "rect" | "circle" | "bezier" | "polygon";
    setTool: (tool: any) => void;
    currentStyle: {
        color: string;
        strokeWidth: number;
        fill: string;
        opacity: number;
    };
    setCurrentStyle: React.Dispatch<React.SetStateAction<any>>;
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    playbackSpeed: number;
    setPlaybackSpeed: (speed: number) => void;
    currentFramePairRef: React.MutableRefObject<{ from: number; to: number }>;
    showGrid: boolean;
    setShowGrid: (show: boolean) => void;
    snapToGrid: boolean;
    setSnapToGrid: (snap: boolean) => void;
    showVertices: boolean;
    setShowVertices: (show: boolean) => void;
    setTempVertices: (vertices: any[]) => void;
    setIsDrawing: (drawing: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    tool, setTool, currentStyle, setCurrentStyle, state, dispatch,
    isPlaying, setIsPlaying, playbackSpeed, setPlaybackSpeed, currentFramePairRef,
    showGrid, setShowGrid, snapToGrid, setSnapToGrid, showVertices, setShowVertices,
    setTempVertices, setIsDrawing
}) => {
    return (
        <div className="w-64 bg-white p-4 shadow-lg overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Tools</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Tool:</label>
                    <select
                        value={tool}
                        onChange={(e) => {
                            setTool(e.target.value as any);
                            setTempVertices([]);
                            setIsDrawing(false);
                        }}
                        className="w-full border rounded px-2 py-1"
                    >
                        <option value="select">Select/Move</option>
                        <option value="vertex">Add Vertex</option>
                        <option value="line">Line</option>
                        <option value="rect">Rectangle</option>
                        <option value="circle">Circle</option>
                        <option value="bezier">Bezier Curve</option>
                        <option value="polygon">Polygon</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Stroke Color:</label>
                    <input
                        type="color"
                        value={currentStyle.color}
                        onChange={(e) => setCurrentStyle((s: any) => ({ ...s, color: e.target.value }))}
                        className="w-full h-10 border rounded"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Fill Color:</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={currentStyle.fill || "#ffffff"}
                            onChange={(e) => setCurrentStyle((s: any) => ({ ...s, fill: e.target.value }))}
                            className="flex-1 h-10 border rounded"
                            disabled={!currentStyle.fill}
                        />
                        <button
                            onClick={() => setCurrentStyle((s: any) => ({ 
                                ...s, 
                                fill: s.fill ? "" : "#ffffff" 
                            }))}
                            className={`px-3 py-1 rounded text-sm ${
                                currentStyle.fill ? "bg-blue-500 text-white" : "bg-gray-200"
                            }`}
                        >
                            {currentStyle.fill ? "On" : "Off"}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Stroke Width: {currentStyle.strokeWidth}px
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={currentStyle.strokeWidth}
                        onChange={(e) => setCurrentStyle((s: any) => ({ ...s, strokeWidth: Number(e.target.value) }))}
                        className="w-full"
                    />
                </div>

                {/* Frame Controls */}
                <div className="border-t pt-4">
                    <h3 className="font-bold text-sm mb-2">Frames</h3>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <button
                                onClick={() => dispatch({ type: "RECORD_FRAME" })}
                                className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
                            >
                                New Frame
                            </button>
                            <button
                                onClick={() => dispatch({ type: "UPDATE_CURRENT_FRAME_DATA" })}
                                disabled={state.frames.length === 0}
                                className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 disabled:bg-gray-300"
                            >
                                Update Frame
                            </button>
                        </div>
                        
                        {state.frames.length > 0 && (
                            <>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (isPlaying) {
                                                setIsPlaying(false);
                                            } else {
                                                currentFramePairRef.current = { 
                                                    from: state.currentFrameIndex, 
                                                    to: (state.currentFrameIndex + 1) % state.frames.length 
                                                };
                                                setIsPlaying(true);
                                            }
                                        }}
                                        className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
                                    >
                                        {isPlaying ? "Stop" : "Play"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (state.currentFrameIndex > 0) {
                                                dispatch({ 
                                                    type: "APPLY_FRAME", 
                                                    frameIndex: state.currentFrameIndex - 1 
                                                });
                                            }
                                        }}
                                        disabled={state.currentFrameIndex === 0 || isPlaying}
                                        className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:bg-gray-300"
                                    >
                                        ◀
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (state.currentFrameIndex < state.frames.length - 1) {
                                                dispatch({ 
                                                    type: "APPLY_FRAME", 
                                                    frameIndex: state.currentFrameIndex + 1 
                                                });
                                            }
                                        }}
                                        disabled={state.currentFrameIndex >= state.frames.length - 1 || isPlaying}
                                        className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:bg-gray-300"
                                    >
                                        ▶
                                    </button>
                                </div>
                                
                                <div>
                                    <label className="text-xs">Speed: {playbackSpeed}x</label>
                                    <input
                                        type="range"
                                        min="0.25"
                                        max="4"
                                        step="0.25"
                                        value={playbackSpeed}
                                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                                        className="w-full"
                                        disabled={isPlaying}
                                    />
                                </div>
                                
                                <div className="max-h-32 overflow-y-auto border rounded p-2">
                                    {state.frames.map((frame, idx) => (
                                        <div
                                            key={frame.id}
                                            className={`flex justify-between items-center p-1 rounded cursor-pointer ${
                                                idx === state.currentFrameIndex ? "bg-blue-100" : "hover:bg-gray-100"
                                            }`}
                                            onClick={() => {
                                                if (!isPlaying) {
                                                    dispatch({ type: "APPLY_FRAME", frameIndex: idx });
                                                }
                                            }}
                                        >
                                            <span className="text-xs">{frame.name}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!isPlaying) {
                                                        dispatch({ type: "DELETE_FRAME", frameIndex: idx });
                                                    }
                                                }}
                                                disabled={isPlaying}
                                                className="text-red-500 text-xs hover:text-red-700 disabled:text-gray-400"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={showGrid}
                            onChange={(e) => setShowGrid(e.target.checked)}
                        />
                        <span className="text-sm">Show Grid</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={snapToGrid}
                            onChange={(e) => setSnapToGrid(e.target.checked)}
                        />
                        <span className="text-sm">Snap to Grid</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={showVertices}
                            onChange={(e) => setShowVertices(e.target.checked)}
                        />
                        <span className="text-sm">Show Vertices</span>
                    </label>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="border-t pt-4 text-xs space-y-1">
                    <div className="font-bold mb-2">Keyboard Shortcuts:</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">S</kbd> Select</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">V</kbd> Vertex</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">L</kbd> Line</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">R</kbd> Rectangle</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">C</kbd> Circle</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">P</kbd> Polygon</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">B</kbd> Bezier</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">G</kbd> Toggle Snap to Grid</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Esc</kbd> Clear Selection</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Del</kbd> Delete Selected</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Shift+Click</kbd> Toggle Selection</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+A</kbd> Select All</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+V</kbd> Import JSON</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+Z</kbd> Undo</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+Shift+Z</kbd> Redo</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Space</kbd> Play Animation</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">0</kbd> Reset View</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Wheel</kbd> Zoom</div>
                    <div><kbd className="bg-gray-200 px-1 rounded">Ctrl+Click</kbd> Pan</div>
                </div>
                <div className="border-t pt-4 text-sm space-y-1">
                    <div>Vertices: {state.vertices.size}</div>
                    <div>Shapes: {state.shapes.size}</div>
                    <div>Frames: {state.frames.length}</div>
                </div>
            </div>
        </div>
    );
};