import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.js',
            refresh: true,
        }),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
    ],

    build: {
        // Raise warning threshold (206KB Sales page is expected)
        chunkSizeWarningLimit: 300,

        rollupOptions: {
            output: {
                // Split vendor libs into separate cached chunks
                manualChunks(id) {
                    // Vue + Inertia core — changes rarely, cache forever
                    if (id.includes('node_modules/vue/') ||
                        id.includes('node_modules/@vue/') ||
                        id.includes('node_modules/@inertiajs/')) {
                        return 'vendor-vue';
                    }
                    // Axios — tiny, stable
                    if (id.includes('node_modules/axios')) {
                        return 'vendor-axios';
                    }
                    // JsBarcode — only needed on Products page
                    if (id.includes('node_modules/jsbarcode')) {
                        return 'vendor-barcode';
                    }
                },
            },
        },
    },
});
