import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createApp } from './server/app.js';
import { providerConfig } from './server/providers.js';

export default defineConfig({
  plugins: [vue(), {
    name: 'cortana-local-api',
    configureServer(vite) {
      const config = providerConfig();
      const configs = Object.fromEntries(['openai', 'ollama', 'ollama-cloud'].map(id => [id, providerConfig(process.env, id)]));
      const api = createApp({ config, configs, port: vite.config.server.port });
      // Mismo backend y mismas protecciones de origen durante desarrollo.
      vite.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api/')) api.emit('request', req, res);
        else next();
      });
      vite.httpServer?.once('close', () => api.emit('close'));
    },
  }],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
