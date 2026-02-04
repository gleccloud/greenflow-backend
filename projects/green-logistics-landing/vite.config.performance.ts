/**
 * Vite Performance Optimization Configuration
 * Code splitting, lazy loading, and bundle optimization
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [react(), visualizer({ open: true })],

  build: {
    // Enable minification
    minify: 'terser',

    // Target modern browsers only
    target: 'ES2020',

    // Code splitting strategy
    rollupOptions: {
      output: {
        // Manual chunks configuration
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('react-hook-form')) {
              return 'form-vendor';
            }
            if (id.includes('zod')) {
              return 'validation-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            return 'vendor';
          }

          // Feature-based chunks
          if (id.includes('src/pages/')) {
            const match = id.match(/src\/pages\/([^/]+)/);
            if (match) {
              return `pages/${match[1]}`;
            }
          }

          if (id.includes('src/components/')) {
            const match = id.match(/src\/components\/([^/]+)/);
            if (match) {
              return `components/${match[1]}`;
            }
          }

          if (id.includes('src/contexts/')) {
            return 'contexts';
          }

          if (id.includes('src/hooks/')) {
            return 'hooks';
          }

          if (id.includes('src/services/')) {
            return 'services';
          }
        },

        // Optimize output file names
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Report compressed size
    reportCompressedSize: true,

    // Terser options for better compression
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },

    // Source maps for production debugging
    sourcemap: 'hidden',
  },

  // Server optimizations
  server: {
    middlewareMode: false,
  },

  // Optimization configurations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'lucide-react',
    ],
  },
});
