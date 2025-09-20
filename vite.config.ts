/// <reference types="vitest" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {/*
        proxy: {
            '/api': { // Path to proxy
                target: 'http://server:5000/api', // Your backend API server
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/api/, ''), // Optional: rewrite path
            }
        },
		*/	
		host: '0.0.0.0', // Listen on all interfaces in container
		port: 3001,
		proxy: {
			'/api': {
				target: 'http://server:5000',
				changeOrigin: true,
				secure: false
			}
		}
	},
	test: {
        // ... Specify options here.
    },
})
