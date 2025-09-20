import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";

interface CSSOutputProps {
    cssString: string;
}

const CSSOutput = ({ cssString }: CSSOutputProps) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(cssString);
        // Add toast notification here in a production app
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">CSS Output</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex items-center gap-2"
                >
                    <CopyIcon className="w-4 h-4" />
                    Copy
                </Button>
            </div>
            <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                <code>{cssString}</code>
            </pre>
        </div>
    );
};

export default CSSOutput;