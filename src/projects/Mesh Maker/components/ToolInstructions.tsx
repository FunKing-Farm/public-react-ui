// components/ToolInstructions.tsx
import React from 'react';
import { type Vertex } from '../types';

interface ToolInstructionsProps {
    tool: "select" | "vertex" | "line" | "rect" | "circle" | "bezier" | "polygon";
    tempVertices: Vertex[];
    isDrawing: boolean;
}

export const ToolInstructions: React.FC<ToolInstructionsProps> = ({ tool, tempVertices, isDrawing }) => {
    const getInstructions = () => {
        switch (tool) {
            case "select":
                return "Click to select • Shift+Click to toggle selection • Drag to move • Drag empty space for box select • Ctrl+Click to pan";
            case "vertex":
                return "Click to place vertex";
            case "line":
                return `Click to place start point${tempVertices.length > 0 ? " • Click to place end point" : ""}`;
            case "rect":
                return `Click and drag to create rectangle${isDrawing ? " • Release to finish" : ""}`;
            case "circle":
                return `Click center then drag to set radius${isDrawing ? " • Release to finish" : ""}`;
            case "polygon":
                return `Click to add points${tempVertices.length > 0 ? ` (${tempVertices.length} points) • Right-click to finish` : ""}`;
            case "bezier":
                return `Click to add anchor points${tempVertices.length > 0 ? ` (${tempVertices.length} points) • Right-click to create curve` : ""}`;
            default:
                return "";
        }
    };

    return (
        <div className="mb-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
            {getInstructions()}
        </div>
    );
};