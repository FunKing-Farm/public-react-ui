// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { type AppState, type AppAction } from '../types';
import { type CanvasHandle } from '../Canvas';

interface UseKeyboardShortcutsProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    canvasRef: React.RefObject<CanvasHandle>;
    setTool: (tool: "select" | "vertex" | "line" | "rect" | "circle" | "bezier" | "polygon") => void;
    setSnapToGrid: (snap: boolean) => void;
    snapToGrid: boolean;
    setIsPlaying: (playing: boolean) => void;
    isPlaying: boolean;
    setTempVertices: (vertices: any[]) => void;
    setIsDrawing: (drawing: boolean) => void;
    setSelectionBox: (box: any) => void;
}

export const useKeyboardShortcuts = ({
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
    setSelectionBox,
}: UseKeyboardShortcutsProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            dispatch({ type: "REDO" });
                        } else {
                            dispatch({ type: "UNDO" });
                        }
                        return;
                        
                    case 'a':
                        e.preventDefault();
                        dispatch({ 
                            type: "SELECT_VERTICES", 
                            ids: Array.from(state.vertices.keys()) 
                        });
                        return;
                        
                    case 'v':
                        return;
                }
            }
            
            switch (e.key.toLowerCase()) {
                case 'delete':
                case 'backspace':
                    e.preventDefault();
                    state.selectedVertexIds.forEach(id => {
                        dispatch({ type: "DELETE_VERTEX", id });
                    });
                    state.selectedShapeIds.forEach(id => {
                        dispatch({ type: "DELETE_SHAPE", id });
                    });
                    break;
                    
                case 'escape':
                    e.preventDefault();
                    setTempVertices([]);
                    setIsDrawing(false);
                    setSelectionBox(null);
                    dispatch({ type: "SELECT_VERTICES", ids: [] });
                    dispatch({ type: "SELECT_SHAPES", ids: [] });
                    setTool("select");
                    break;
                    
                case 'g':
                    e.preventDefault();
                    setSnapToGrid(!snapToGrid);
                    break;
                    
                case 's':
                    e.preventDefault();
                    setTool("select");
                    break;
                    
                case 'v':
                    e.preventDefault();
                    setTool("vertex");
                    break;
                    
                case 'l':
                    e.preventDefault();
                    setTool("line");
                    break;
                    
                case 'r':
                    e.preventDefault();
                    setTool("rect");
                    break;
                    
                case 'c':
                    e.preventDefault();
                    setTool("circle");
                    break;
                    
                case 'p':
                    e.preventDefault();
                    setTool("polygon");
                    break;
                    
                case 'b':
                    e.preventDefault();
                    setTool("bezier");
                    break;
                    
                case ' ':
                    if (!isPlaying && state.frames.length > 1) {
                        e.preventDefault();
                        setIsPlaying(true);
                    }
                    break;
                    
                case '0':
                    e.preventDefault();
                    canvasRef.current?.resetViewport();
                    break;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.selectedVertexIds, state.selectedShapeIds, state.vertices, snapToGrid, 
        isPlaying, state.frames.length, dispatch, canvasRef, setTool, setSnapToGrid, 
        setIsPlaying, setTempVertices, setIsDrawing, setSelectionBox]);
};