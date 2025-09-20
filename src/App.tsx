// src/App.tsx
import React, { useState, useEffect } from 'react';
import ProjectLanding from './components/ProjectLanding';
import ProjectViewer from './components/ProjectViewer';
import './index.css';

export interface Project {
    name: string;
    path: string;
    hasRequiredFiles: boolean;
}

export const nestObject = (nestObj: { [x: string]: any; }): string => {
    let returnValue = "";
    if (nestObj) {
        Array.isArray(nestObj) ? returnValue += "[" : returnValue += "{";
        Object.keys(nestObj).map((key) => {
            returnValue += " " + key + ":";
            if (typeof nestObj[key] === "object") {
                returnValue += " " + nestObject(nestObj[key]) + ",";
            } else {
                returnValue += " " + nestObj[key] + ",";
            }
        });
        Array.isArray(nestObj)
            ? returnValue = returnValue.slice(0, -1) + "] "
            : returnValue = returnValue.slice(0, -1) + "} ";
    }
    return returnValue;
};

const App: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const discoverProjects = async () => {
            try {
                // In a Vite environment, we can use import.meta.glob to discover modules
                const prefix = "/src/projects/";
                const appTsx = "/App.tsx";
                const indexCss = "/index.css";
                const projectModulesMain = import.meta.glob('/src/projects/*/main.tsx');
                const projectModulesApp = import.meta.glob('/src/projects/*/App.tsx');
                const projectModulesCss = import.meta.glob('/src/projects/*/index.css');
                const discoveredProjects: Project[] = [];

                for (const path in projectModulesMain) {
                    const match = path.match(/\/src\/projects\/([^\/]+)\/main\.tsx$/);
                    if (match) {
                        const projectName = match[1];
                        let found = false;
                        for (const appPath in projectModulesApp) {
                            if (appPath.match(prefix + projectName + appTsx)) {
                                found = true;
                                break;
                            }
                        }
                        if (found) {
                            found = false;
                            for (const cssPath in projectModulesCss) {
                                if (cssPath.match(prefix + projectName + indexCss)) {
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (found) {
                            discoveredProjects.push({
                                name: projectName,
                                path: `/src/projects/${projectName}`,
                                hasRequiredFiles: true
                            });
                        }
                        else {
                            // Project doesn't have all required files
                            discoveredProjects.push({
                                name: projectName,
                                path: `/src/projects/${projectName}`,
                                hasRequiredFiles: false
                            });
                        }
                    }
                }
                setProjects(discoveredProjects);
            } catch (error) {
                console.error('Error discovering projects:', error);
            } finally {
                setLoading(false);
            }
        };

        discoverProjects();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading projects...</div>
            </div>
        );
    }

    if (selectedProject) {
        return (
            <ProjectViewer
                projectName={selectedProject}
                onBack={() => setSelectedProject(null)}
            />
        );
    }

    return (
        <div>
        <ProjectLanding
            projects={projects}
            onSelectProject={setSelectedProject}
            />
        </div>
    );
};

export default App;