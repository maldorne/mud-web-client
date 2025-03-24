import { defineConfig } from 'vite';
import { resolve } from 'path';

import legacy from '@vitejs/plugin-legacy';
import inject from '@rollup/plugin-inject';

export default defineConfig({
  base: './',
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
    inject({
      $: 'jquery',
      jQuery: 'jquery',
    }),
  ],
  build: {
    commonjsOptions: { transformMixedEsModules: true },
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks: {
          // jquery: ['jquery'],
          'jquery-ui': ['jquery-ui-dist/jquery-ui.js'],
          'jquery-nicescroll': ['jquery.nicescroll'],
          bootstrap: ['bootstrap/dist/js/bootstrap.bundle.min.js'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'jquery',
      'jquery-ui-dist/jquery-ui.js',
      'jquery.nicescroll',
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons',
      '@fortawesome/free-regular-svg-icons',
      '@fortawesome/free-brands-svg-icons',
      'bootstrap/dist/js/bootstrap.bundle.min.js',
    ],
  },
  resolve: {
    alias: {
      '@fortawesome': resolve(__dirname, 'node_modules/@fortawesome'),
      jquery: resolve(__dirname, 'node_modules/jquery/dist/jquery.js'),
      'jquery-ui': resolve(
        __dirname,
        'node_modules/jquery-ui-dist/jquery-ui.js',
      ),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: [
          [
            '@import "@fortawesome/fontawesome-svg-core/styles.css";',
            '@import "bootstrap/dist/css/bootstrap.css";',
          ].join('\n'),
        ],
      },
    },
  },
});
