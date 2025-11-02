
import checker from 'vite-plugin-checker';
import { defineConfig } from 'vite'

export default defineConfig({
    base: '/Winterboard/',
    build: { target: 'es2022' },
    plugins: [
        checker({ typescript: true })
    ]
})
