// components/Toolbar.tsx
import React from 'react';
import { type AppState, type AppAction } from '../types';

interface ToolbarProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    mergeSelectedVertices: () => void;
    showExportPreview: boolean;
    setShowExportPreview: (show: boolean) => void;
    onImport: () => void;
    onExport: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    state,
    dispatch,
    mergeSelectedVertices,
    showExportPreview,
    setShowExportPreview,
    onImport,
    onExport,
}) => {
    return (
        <div className="bg-white p-3 shadow-md flex gap-2 flex-wrap">
            <button
                onClick={() => dispatch({ type: "UNDO" })}
                disabled={state.history.past.length === 0}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
                Undo
            </button>
            <button
                onClick={() => dispatch({ type: "REDO" })}
                disabled={state.history.future.length === 0}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
                Redo
            </button>
            <button
                onClick={mergeSelectedVertices}
                disabled={state.selectedVertexIds.size < 2}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
            >
                Merge Vertices
            </button>
            <button
                onClick={() => {
                    state.selectedVertexIds.forEach(id => {
                        dispatch({ type: "DELETE_VERTEX", id });
                    });
                    state.selectedShapeIds.forEach(id => {
                        dispatch({ type: "DELETE_SHAPE", id });
                    });
                }}
                disabled={state.selectedVertexIds.size === 0 && state.selectedShapeIds.size === 0}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:bg-gray-300"
            >
                Delete Selected
            </button>
            <button
                onClick={() => dispatch({ type: "CLEAR_ALL" })}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
                Clear All
            </button>
            <div className="flex-1"></div>
            <button
                onClick={() => setShowExportPreview(!showExportPreview)}
                className={`px-4 py-2 rounded ${
                    showExportPreview 
                        ? "bg-purple-600 text-white" 
                        : "bg-purple-500 text-white hover:bg-purple-600"
                }`}
            >
                {showExportPreview ? "Hide" : "Preview"} Export Box
            </button>
            <button
                onClick={onImport}
                className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
                Import JSON
            </button>
            <button
                onClick={onExport}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
                Export JSON
            </button>
        </div>
    );
};