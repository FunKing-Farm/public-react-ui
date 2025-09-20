import React, {
    useRef,
    useEffect,
    useState,
    useReducer,
    useCallback,
} from "react";

interface Point {
    x: number;
    y: number;
}

interface Shape {
    type: "line" | "rect" | "circle";
    start: Point;
    end: Point;
    color: string;
    size: number;
}

interface CanvasState {
    shapes: Shape[];
    history: Shape[][];
    historyIndex: number;
}

type CanvasAction =
    | { type: "ADD_SHAPE"; shape: Shape }
    | { type: "UNDO" }
    | { type: "CLEAR" };

const canvasReducer = (
    state: CanvasState,
    action: CanvasAction
): CanvasState => {
    switch (action.type) {
        case "ADD_SHAPE":
            { 
            const newShapes = [...state.shapes, action.shape];
            const newHistory = [
                ...state.history.slice(0, state.historyIndex + 1),
                newShapes,
            ];
            return {
                shapes: newShapes,
                history: newHistory,
                historyIndex: state.historyIndex + 1,
            };
        }
        case "UNDO":
            if (state.historyIndex <= 0) return state;
            return {
                ...state,
                shapes: state.history[state.historyIndex - 1],
                historyIndex: state.historyIndex - 1,
            };
        case "CLEAR":
            return { shapes: [], history: [[]], historyIndex: 0 };
        default:
            return state;
    }
};

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<"line" | "rect" | "circle">("line");
    const [color, setColor] = useState("#000000");
    const [size, setSize] = useState(5);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [state, dispatch] = useReducer(canvasReducer, {
        shapes: [],
        history: [[]],
        historyIndex: 0,
    });

    const getCanvasPoint = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
            const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left - transform.x) / transform.scale,
                y: (clientY - rect.top - transform.y) / transform.scale,
            };
        },
        [transform]
    );

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);

        state.shapes.forEach((shape) => {
            ctx.beginPath();
            ctx.strokeStyle = shape.color;
            ctx.lineWidth = shape.size;

            switch (shape.type) {
                case "line":
                    ctx.moveTo(shape.start.x, shape.start.y);
                    ctx.lineTo(shape.end.x, shape.end.y);
                    break;
                case "rect":
                    ctx.rect(
                        shape.start.x,
                        shape.start.y,
                        shape.end.x - shape.start.x,
                        shape.end.y - shape.start.y
                    );
                    break;
                case "circle":
                    {
                        const radius = Math.sqrt(
                            Math.pow(shape.end.x - shape.start.x, 2) +
                            Math.pow(shape.end.y - shape.start.y, 2)
                        );
                        ctx.arc(shape.start.x, shape.start.y, radius, 0, Math.PI * 2);
                        break;
                    }
            }
            ctx.stroke();
        });

        ctx.restore();
    }, [state.shapes, transform]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = window.innerWidth * 0.8;
        canvas.height = window.innerHeight * 0.7;
        draw();
    }, [draw]);

    const startDrawing = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            setIsDrawing(true);
            setStartPoint(getCanvasPoint(e));
        },
        [getCanvasPoint]
    );

    const drawShape = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing || !startPoint) return;
            const currentPoint = getCanvasPoint(e);
            draw();
            const ctx = canvasRef.current?.getContext("2d");
            if (!ctx) return;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = size;

            switch (tool) {
                case "line":
                    ctx.moveTo(startPoint.x, startPoint.y);
                    ctx.lineTo(currentPoint.x, currentPoint.y);
                    break;
                case "rect":
                    ctx.rect(
                        startPoint.x,
                        startPoint.y,
                        currentPoint.x - startPoint.x,
                        currentPoint.y - startPoint.y
                    );
                    break;
                case "circle":
                    {
                        const radius = Math.sqrt(
                            Math.pow(currentPoint.x - startPoint.x, 2) +
                            Math.pow(currentPoint.y - startPoint.y, 2)
                        );
                        ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
                        break;
                    }
            }
            ctx.stroke();
        },
        [isDrawing, startPoint, color, size, tool, draw, getCanvasPoint]
    );

    const endDrawing = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing || !startPoint) return;
            const endPoint = getCanvasPoint(e);
            dispatch({
                type: "ADD_SHAPE",
                shape: { type: tool, start: startPoint, end: endPoint, color, size },
            });
            setIsDrawing(false);
            setStartPoint(null);
        },
        [isDrawing, startPoint, tool, color, size, getCanvasPoint]
    );

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
        setTransform((t) => ({
            ...t,
            scale: Math.max(0.1, Math.min(5, t.scale * scaleFactor)),
        }));
    }, []);

    const handlePan = useCallback((e: MouseEvent) => {
        if (e.buttons !== 2) return;
        setTransform((t) => ({
            ...t,
            x: t.x + e.movementX,
            y: t.y + e.movementY,
        }));
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.addEventListener("wheel", handleWheel);
        canvas.addEventListener("mousemove", handlePan);
        return () => {
            canvas.removeEventListener("wheel", handleWheel);
            canvas.removeEventListener("mousemove", handlePan);
        };
    }, [handleWheel, handlePan]);

    const saveDrawing = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = "drawing.png";
        link.href = canvas.toDataURL();
        link.click();
    };

    return (
        <div className="flex flex-col items-center h-screen bg-gray-100 p-4">
            <div className="flex space-x-4 mb-4 bg-white p-4 rounded-lg shadow-md">
                <select
                    value={tool}
                    onChange={(e) => setTool(e.target.value as any)}
                    className="border rounded px-2 py-1"
                >
                    <option value="line">Line</option>
                    <option value="rect">Rectangle</option>
                    <option value="circle">Circle</option>
                </select>
                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10"
                />
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    className="w-32"
                />
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={drawShape}
                onMouseUp={endDrawing}
                onTouchStart={startDrawing}
                onTouchMove={drawShape}
                onTouchEnd={endDrawing}
                className="border-2 border-gray-300 rounded-lg bg-white shadow-lg"
            />
            <div className="flex space-x-4 mt-4">
                <button
                    onClick={() => dispatch({ type: "UNDO" })}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Undo
                </button>
                <button
                    onClick={() => dispatch({ type: "CLEAR" })}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Clear
                </button>
                <button
                    onClick={saveDrawing}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default App;
