import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    lib: {
      entry: {
        'index': 'src/index.ts',
        'dom/index': 'src/dom/index.ts',
        'vue/index': 'src/vue/index.ts',
        'react/index': 'src/react/index.tsx',
        'react-router/index': 'src/react-router/index.tsx',
        'vanilla/index': 'src/vanilla/index.ts',
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rolldownOptions: {
      external: ['vue', 'vue-router', 'react', 'react/jsx-runtime', 'react-dom', 'react-router'],
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
})
