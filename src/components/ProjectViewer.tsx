// src/components/ProjectViewer.tsx
import React, { useState, useEffect } from 'react';

interface ProjectViewerProps {
    projectName: string;
    onBack: () => void;
}

const ProjectViewer: React.FC<ProjectViewerProps> = ({ projectName, onBack }) => {
    const [ProjectComponent, setProjectComponent] = useState<React.ComponentType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProject = async () => {
            try {
                setLoading(true);
                setError(null);

                // Dynamically import the project's App component
                const projectModule = await import(`../projects/${projectName}/App.tsx`);

                // Also load the project's CSS
                await import(`../projects/${projectName}/index.css`);

                setProjectComponent(() => projectModule.default);
            } catch (err) {
                console.error(`Error loading project ${projectName}:`, err);
                setError(`Failed to load project: ${projectName}`);
            } finally {
                setLoading(false);
            }
        };

        loadProject();
    }, [projectName]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <div className="text-xl text-gray-600">Loading {projectName}...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-4">{error}</div>
                    <button
                        onClick={onBack}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="bg-white shadow-sm border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-800">
                        {projectName}
                    </h1>
                    <button
                        onClick={onBack}
                        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Projects
                    </button>
                </div>
            </div>
            <div className="project-container">
                {ProjectComponent && <ProjectComponent />}
            </div>
        </div>
    );
};

export default ProjectViewer;