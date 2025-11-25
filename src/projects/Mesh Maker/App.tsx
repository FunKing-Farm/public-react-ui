import React, { useRef, useReducer, useState, useEffect } from "react";
import { appReducer } from './reducer';
import { Canvas, type CanvasHandle } from './Canvas';
import { Sidebar } from './Sidebar';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './components/Toolbar';
import { ZoomControls } from './components/ZoomControls';
import { ToolInstructions } from './components/ToolInstructions';
import { useImportExport } from './hooks/useImportExport';
import { useVertexOperations } from './hooks/useVertexOperations';
import { useAnimationPlayback } from './hooks/useAnimationPlayback';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const App: React.FC = () => {
    const canvasRef = useRef<CanvasHandle>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [tool, setTool] = useState<"select" | "vertex" | "line" | "rect" | "circle" | "bezier" | "polygon">("select");
    const [currentStyle, setCurrentStyle] = useState({
        color: "#000000",
        strokeWidth: 2,
        fill: "",
        opacity: 1,
    });
    
    const [snapToVertices] = useState(true);
    const [snapRadius] = useState(15);
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [gridSize] = useState(20);
    const [showVertices, setShowVertices] = useState(true);
    const [showControlHandles] = useState(true);
    const [showExportPreview, setShowExportPreview] = useState(false);
    
    const [state, dispatch] = useReducer(appReducer, {
        vertices: new Map(),
        shapes: new Map(),
        groups: new Map(),
        frames: [],
        currentFrameIndex: 0,
        isRecording: false,
        selectedVertexIds: new Set(),
        selectedShapeIds: new Set(),
        hoveredVertexId: null,
        hoveredShapeId: null,
        history: { past: [], future: [] },
    });

    // Custom hooks for business logic
    const {
        exportToJSON,
        handleFileImport,
        handlePaste,
        importStatus,
    } = useImportExport({ state, dispatch, gridSize });

    const {
        snapPoint,
        findVertexAt,
        findNearbyVertexForSnap,
        getOrCreateVertex,
        mergeSelectedVertices,
    } = useVertexOperations({
        state,
        dispatch,
        snapToVertices,
        snapRadius,
        snapToGrid,
        gridSize,
    });

    const {
        isPlaying,
        setIsPlaying,
        playbackSpeed,
        setPlaybackSpeed,
        currentFramePairRef,
    } = useAnimationPlayback({ state, dispatch });

    const {
        isDrawing,
        setIsDrawing,
        tempVertices,
        setTempVertices,
        selectionBox,
        nearbyVertexId,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleContextMenu,
    } = useCanvasInteraction({
        state,
        dispatch,
        tool,
        currentStyle,
        findVertexAt,
        findNearbyVertexForSnap,
        getOrCreateVertex,
        snapPoint,
        snapToGrid,
    });

    // Keyboard shortcuts
    useKeyboardShortcuts({
        state,
        dispatch,
        canvasRef,
        setTool,
        setSnapToGrid,
        snapToGrid,
        setIsPlaying,
        isPlaying,
        setTempVertices,
        setIsDrawing,
        setSelectionBox: (box: any) => {}, // This is handled in useCanvasInteraction
    });

    // Paste handler
    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            handlePaste(e);
        };
        
        document.addEventListener('paste', handleGlobalPaste);
        return () => document.removeEventListener('paste', handleGlobalPaste);
    }, [handlePaste]);

    return (
        <div className="flex h-screen bg-gray-100">
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                style={{ display: 'none' }}
            />
            
            <Sidebar 
                tool={tool}
                setTool={setTool}
                currentStyle={currentStyle}
                setCurrentStyle={setCurrentStyle}
                state={state}
                dispatch={dispatch}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                playbackSpeed={playbackSpeed}
                setPlaybackSpeed={setPlaybackSpeed}
                currentFramePairRef={currentFramePairRef}
                showGrid={showGrid}
                setShowGrid={setShowGrid}
                snapToGrid={snapToGrid}
                setSnapToGrid={setSnapToGrid}
                showVertices={showVertices}
                setShowVertices={setShowVertices}
                setTempVertices={setTempVertices}
                setIsDrawing={setIsDrawing}
            />

            <div className="flex-1 flex flex-col">
                <Toolbar
                    state={state}
                    dispatch={dispatch}
                    mergeSelectedVertices={mergeSelectedVertices}
                    showExportPreview={showExportPreview}
                    setShowExportPreview={setShowExportPreview}
                    onImport={() => fileInputRef.current?.click()}
                    onExport={exportToJSON}
                />

                {importStatus.type && (
                    <div className={`mx-4 mt-2 p-3 rounded ${
                        importStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                        {importStatus.message}
                    </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-200">
                    <ToolInstructions tool={tool} tempVertices={tempVertices} isDrawing={isDrawing} />
                    
                    <div className="relative">
                        <Canvas
                            ref={canvasRef}
                            width={1200}
                            height={800}
                            vertices={state.vertices}
                            shapes={state.shapes}
                            selectedVertexIds={state.selectedVertexIds}
                            selectedShapeIds={state.selectedShapeIds}
                            hoveredVertexId={state.hoveredVertexId}
                            hoveredShapeId={state.hoveredShapeId}
                            tempVertices={tempVertices}
                            selectionBox={selectionBox}
                            tool={tool}
                            currentStyle={currentStyle}
                            showGrid={showGrid}
                            showVertices={showVertices}
                            showControlHandles={showControlHandles}
                            showExportPreview={showExportPreview}
                            nearbyVertexId={nearbyVertexId}
                            snapToVertices={snapToVertices}
                            gridSize={gridSize}
                            currentFrameIndex={state.currentFrameIndex}
                            totalFrames={state.frames.length}
                            isRecording={state.isRecording}
                            frames={state.frames}
                            isDrawing={isDrawing} // Pass isDrawing state
                            onMouseDown={(point, e) => handleMouseDown(point, e, () => canvasRef.current?.getViewport() || { zoom: 1, offsetX: 0, offsetY: 0 })}
                            onMouseMove={(point, e) => handleMouseMove(point, e, (v) => canvasRef.current?.setViewport(typeof v === 'function' ? v(canvasRef.current?.getViewport()) : v))}
                            onMouseUp={handleMouseUp}
                            onContextMenu={handleContextMenu}
                        />
                        
                        <ZoomControls canvasRef={canvasRef} />
                    </div>
                </div>
            </div>

            <PropertiesPanel 
                state={state}
                dispatch={dispatch}
                showExportPreview={showExportPreview}
                gridSize={gridSize}
                mergeSelectedVertices={mergeSelectedVertices}
            />
        </div>
    );
};

export default App;