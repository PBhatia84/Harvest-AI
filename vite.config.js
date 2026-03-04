import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'harvest-ai' below with your exact GitHub repository name
export default defineConfig({
  plugins: [react()],
  base: '/harvest-ai/',
})
