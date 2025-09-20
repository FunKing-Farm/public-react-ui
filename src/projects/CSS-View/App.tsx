import { useState, useMemo } from "react";
import ControlPanel from "./components/ControlPanel";
import PreviewArea from "./components/PreviewArea";
import CSSOutput from "./components/CSSOutput";

// Define types for our CSS properties
export interface CSSProperties {
    backgroundColor: string;
    backgroundType: "solid" | "gradient";
    gradientColors: [string, string];
    fontFamily: string;
    fontSize: number;
    textColor: string;
    borderWidth: number;
    borderColor: string;
    borderRadius: number;
    padding: number;
    boxShadow: string;
    cursor: "default" | "pointer" | "text" | "not-allowed" | "move";
    link_cursor: "default" | "pointer" | "text" | "not-allowed" | "move";
    button_cursor: "default" | "pointer" | "text" | "not-allowed" | "move";
    link_initial_color: string;
    link_used_color: string;
}

const defaultStyles: CSSProperties = {
    backgroundColor: "#ffffff",
    backgroundType: "solid",
    gradientColors: ["#ffffff", "#f0f0f0"],
    fontFamily: "Arial",
    fontSize: 16,
    textColor: "#333333",
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 4,
    padding: 5,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    cursor: "default",
    link_cursor: "pointer",
    button_cursor: "pointer",
    link_initial_color: "#0000FF",
    link_used_color: "#800080"
};

const App = () => {
    const [styles, setStyles] = useState<CSSProperties>(defaultStyles);

    // Generate CSS string from current styles
    const cssString = useMemo(() => {
        const background =
            styles.backgroundType === "gradient"
                ? `linear-gradient(135deg, ${styles.gradientColors[0]}, ${styles.gradientColors[1]})`
                : styles.backgroundColor;

        return `
.preview-container {
  background: ${background};
  font-family: ${styles.fontFamily};
  font-size: ${styles.fontSize}px;
  color: ${styles.textColor};
  border: ${styles.borderWidth}px solid ${styles.borderColor};
  border-radius: ${styles.borderRadius}px;
  box-shadow: ${styles.boxShadow};
  padding: ${styles.padding};
  cursor: ${styles.cursor};
}

.preview-link {
  text-decoration: underline;
  cursor: ${styles.link_cursor};
}

.preview-link:visited, preview-link:hover, preview-link:active {
  color: ${styles.link_used_color};
}

.preview-link:link {
  color: ${styles.link_initial_color};
}

.preview-button {
  cursor: ${styles.button_cursor};
}
`;
    }, [styles]);

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-800">Visual CSS UI Builder</h1>
            </header>
            <main className="container mx-auto p-5 grid grid-cols-3 lg:grid-cols-3 gap-10">
                            <ControlPanel styles={styles} setStyles={setStyles} />
                            <PreviewArea styles={styles} />
                            <CSSOutput cssString={cssString} />
            </main>
        </div>
    );
};

export default App;