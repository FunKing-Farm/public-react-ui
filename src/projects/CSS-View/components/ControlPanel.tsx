import type { CSSProperties } from "../App";
import { Input } from "@/components/ui/input";

interface ControlPanelProps {
    styles: CSSProperties;
    setStyles: React.Dispatch<React.SetStateAction<CSSProperties>>;
}

const fontOptions = ["Arial", "Helvetica", "Times New Roman", "Courier New", "Verdana"];
const cursorOptions = ['default', 'pointer', 'text', 'not-allowed', 'move'] as const;
const shadowOptions = ['none', '0 1px 3px rgba(0,0,0,0.2)', '0 4px 6px rgba(0,0,0,0.2)']

const ControlPanel = ({ styles, setStyles }: ControlPanelProps) => {
    const updateStyle = <K extends keyof CSSProperties>(
        key: K,
        value: CSSProperties[K]
    ) => {
        setStyles((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h2 className="text-xl font-semibold mb-4">Controls</h2>

            {/* Background Controls */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Background</h3>
                <div className="space-y-2">
                    <select
                        className="w-full p-2 border rounded-md"
                        value={styles.backgroundType}
                        onChange={(e) => updateStyle("backgroundType", e.target.value as "solid" | "gradient")}
                    >
                        <option value="solid">Solid Color</option>
                        <option value="gradient">Gradient</option>
                    </select>

                    {styles.backgroundType === "solid" ? (
                        <Input
                            type="color"
                            value={styles.backgroundColor}
                            onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                            className="w-full"
                        />
                    ) : (
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={styles.gradientColors[0]}
                                onChange={(e) => updateStyle("gradientColors", [
                                    e.target.value,
                                    styles.gradientColors[1],
                                ])}
                            />
                            <Input
                                type="color"
                                value={styles.gradientColors[1]}
                                onChange={(e) => updateStyle("gradientColors", [
                                    styles.gradientColors[0],
                                    e.target.value,
                                ])}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Font Controls */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Typography</h3>
                <div className="space-y-2">
                    <label className="block text-sm font-medium mb-1">Font</label>
                    <select
                        className="w-full p-2 border rounded-md"
                        value={styles.fontFamily}
                        onChange={(e) => updateStyle("fontFamily", e.target.value)}
                    >
                        {fontOptions.map((font) => (
                            <option key={font} value={font}>{font}</option>
                        ))}
                    </select>
                    <label className="block text-sm font-medium mb-1">size</label>
                    <Input
                        type="number"
                        value={styles.fontSize}
                        onChange={(e) => updateStyle("fontSize", Number(e.target.value))}
                        min={8}
                        max={72}
                    />
                    <label className="block text-sm font-medium mb-1">Text color</label>
                    <Input
                        type="color"
                        value={styles.textColor}
                        onChange={(e) => updateStyle("textColor", e.target.value)}
                    />
                    <label className="block text-sm font-medium mb-1">default link color</label>
                    <Input
                        type="color"
                        value={styles.link_initial_color}
                        onChange={(e) => updateStyle("link_initial_color", e.target.value)}
                    />
                    <label className="block text-sm font-medium mb-1">visited link color</label>
                    <Input
                        type="color"
                        value={styles.link_used_color}
                        onChange={(e) => updateStyle("link_used_color", e.target.value)}
                    />
                </div>

            </div>

            {/* Border Controls */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Border</h3>
                <div className="space-y-2">
                    <label className="block text-sm font-medium mb-1">width</label>
                    <Input
                        type="number"
                        value={styles.borderWidth}
                        onChange={(e) => updateStyle("borderWidth", Number(e.target.value))}
                        min={0}
                        max={10}
                    />
                    <label className="block text-sm font-medium mb-1">color</label>
                    <Input
                        type="color"
                        value={styles.borderColor}
                        onChange={(e) => updateStyle("borderColor", e.target.value)}
                    />

                    <label className="block text-sm font-medium mb-1">radius</label>
                    <Input
                        type="number"
                        value={styles.borderRadius}
                        onChange={(e) => updateStyle("borderRadius", Number(e.target.value))}
                        min={0}
                        max={50}
                    />
                    <div>
                        <label className="block text-sm font-medium mb-2">Padding (px)</label>
                        <Input
                            type="number"
                            value={parseInt(styles.padding)}
                            onChange={(e) => updateStyle('padding', Number(e.target.value))}
                            min={0}
                            max={50}
                        />
                    </div>
                </div>
            </div>

            <div className="mb-6">
            <div>
                <h3 className="text-lg font-medium mb-2">Shadow</h3>
                <select
                    value={styles.boxShadow}
                    onChange={(e) => updateStyle('boxShadow', e.target.value)}
                    className="w-full p-2 border rounded-md"
                >
                    {shadowOptions.map(shadow => (
                        <option key={shadow} value={shadow}>
                            {shadow === 'none' ? 'None' : `Shadow ${shadowOptions.indexOf(shadow)}`}
                        </option>
                    ))}
                </select>
                </div>
            </div>

            {/* Cursor Control */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Cursor</h3>
                <label className="block text-sm font-medium mb-1">normal</label>
                <select
                    className="w-full p-2 border rounded-md"
                    value={styles.cursor}
                    onChange={(e) => updateStyle("cursor", e.target.value as typeof cursorOptions[number])}
                >
                    {cursorOptions.map((cursor) => (
                        <option key={cursor} value={cursor}>{cursor}</option>
                    ))}
                </select>
                <label className="block text-sm font-medium mb-1">link:hover</label>
                <select
                    className="w-full p-2 border rounded-md"
                    value={styles.link_cursor}
                    onChange={(e) => updateStyle("link_cursor", e.target.value as typeof cursorOptions[number])}
                >
                    {cursorOptions.map((cursor) => (
                        <option key={cursor} value={cursor}>{cursor}</option>
                    ))}
                </select>
                <label className="block text-sm font-medium mb-1">input:hover</label>
                <select
                    className="w-full p-2 border rounded-md"
                    value={styles.button_cursor}
                    onChange={(e) => updateStyle("button_cursor", e.target.value as typeof cursorOptions[number])}
                >
                    {cursorOptions.map((cursor) => (
                        <option key={cursor} value={cursor}>{cursor}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default ControlPanel;