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
        'compat/index': 'src/compat/index.ts',
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rolldownOptions: {
      external: ['vue', 'vue-router'],
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
})
