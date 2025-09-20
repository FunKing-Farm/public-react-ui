import type { CSSProperties } from "../App.tsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PreviewAreaProps {
    styles: CSSProperties;
}

const PreviewArea = ({ styles }: PreviewAreaProps) => {
    const backgroundStyle =
        styles.backgroundType === "gradient"
            ? { background: `linear-gradient(135deg, ${styles.gradientColors[0]}, ${styles.gradientColors[1]})` }
            : { backgroundColor: styles.backgroundColor };

    const containerStyle = {
        ...backgroundStyle,
        fontFamily: styles.fontFamily,
        fontSize: `${styles.fontSize}px`,
        color: styles.textColor,
        border: `${styles.borderWidth}px solid ${styles.borderColor}`,
        borderRadius: `${styles.borderRadius}px`,
        padding: `${styles.padding}px`,
        boxShadow: styles.boxShadow,
        cursor: styles.cursor,
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            <div
                style={containerStyle}
                className="p-6 rounded-lg"
            >
                <div className="space-y-4">
                    <Input
                        placeholder="Sample input"
                        style={{ cursor: styles.cursor }}
                    />
                    <table>
                    <tbody>
                        <tr>
                            <td>
                                <Button className='preview-button' style={{ cursor: styles.button_cursor }}>
                                Sample Button
                                </Button>
                            </td>
                            <td style={{ width: '10px' }} ></td>
                            <td><a className='preview-link' href='#' style={{ cursor: styles.link_cursor, color: styles.link_initial_color }}>Fresh Link</a></td>
                            <td style={{ width: '10px' }} ></td>
                            <td>
                                <a className='preview-link' href='#' style={{ cursor: styles.link_cursor, color: styles.link_used_color }}>Used Link</a>
                            </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <p>This is a sample text with your selected styles.</p>
                </div>
            </div>
        </div>
    );
};

export default PreviewArea;