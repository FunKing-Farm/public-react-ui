// src/components/ProjectLanding.tsx
import React from 'react';
import type { Project } from '@/App.tsx';

interface ProjectLandingProps {
    projects: Project[];
    onSelectProject: (projectName: string) => void;
}

const ProjectLanding: React.FC<ProjectLandingProps> = ({ projects, onSelectProject }) => {
    const validProjects = projects.filter(p => p.hasRequiredFiles);
    const invalidProjects = projects.filter(p => !p.hasRequiredFiles);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">
                        React Development Environment
                    </h1>
                    <p className="text-lg text-gray-600">
                        Select a project to view and interact with
                    </p>
                </header>

                {validProjects.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Available Projects</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {validProjects.map((project) => (
                                <div
                                    key={project.name}
                                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer border border-gray-200"
                                    onClick={() => onSelectProject(project.name)}
                                >
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-semibold text-gray-800">
                                                {project.name}
                                            </h3>
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        </div>
                                        <p className="text-gray-600 mb-4">
                                            Click to launch this project
                                        </p>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            {project.path}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {invalidProjects.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Incomplete Projects</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {invalidProjects.map((project) => (
                                <div
                                    key={project.name}
                                    className="bg-gray-50 rounded-lg shadow-sm border border-gray-300 opacity-75"
                                >
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-semibold text-gray-600">
                                                {project.name}
                                            </h3>
                                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                        </div>
                                        <p className="text-gray-500 mb-4">
                                            Missing required files (App.tsx, index.css)
                                        </p>
                                        <div className="flex items-center text-sm text-gray-400">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            {project.path}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {projects.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-gray-500 text-lg mb-4">No projects found</div>
                        <p className="text-gray-400">
                            Create a new project in the <code className="bg-gray-200 px-2 py-1 rounded">src/projects/</code> directory
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectLanding;