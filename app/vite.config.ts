import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import dotenv from 'dotenv'
import { handleSyncUser } from './api/sync-user'
import { handleGetProgress, handleSaveProgress } from './api/progress'
import { handleExecuteCode } from './api/code/execute'
import { handleGetShorts } from './api/shorts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isCI = process.env.CI === 'true';
  if (!isCI) {
    if (mode === 'development') {
      Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
    } else {
      dotenv.config();
    }
  }

  return {
  base: './',
  envDir: isCI ? false : undefined,
  plugins: [
    inspectAttr(),
    react(),
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use('/api/code/execute', async (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed.' }));
            return;
          }

          const maxBodyBytes = 400 * 1024;
          const declaredLength = Number(req.headers['content-length'] || 0);
          if (declaredLength > maxBodyBytes) {
            req.resume();
            res.statusCode = 413;
            res.end(JSON.stringify({ ok: false, error: 'Request body exceeds the size limit.' }));
            return;
          }

          let bodyText = '';
          let receivedBytes = 0;
          let tooLarge = false;
          req.on('data', (chunk) => {
            if (tooLarge) return;
            receivedBytes += chunk.length;
            if (receivedBytes > maxBodyBytes) {
              tooLarge = true;
              res.statusCode = 413;
              res.end(JSON.stringify({ ok: false, error: 'Request body exceeds the size limit.' }));
              req.resume();
              return;
            }
            bodyText += chunk.toString('utf8');
          });

          req.on('end', async () => {
            if (tooLarge || res.writableEnded) return;
            let body: unknown;
            try {
              body = bodyText ? JSON.parse(bodyText) : {};
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Request body must be valid JSON.' }));
              return;
            }

            try {
              const result = await handleExecuteCode(body, req.headers, process.env);
              for (const [name, value] of Object.entries(result.headers || {})) res.setHeader(name, value);
              res.statusCode = result.status;
              res.end(JSON.stringify(result.data));
            } catch {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: 'Code execution API request failed.' }));
            }
          });
        });

        server.middlewares.use('/api/sync-user', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }

          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            try {
              const body = bodyStr ? JSON.parse(bodyStr) : {};
              const result = await handleSyncUser(body, req.headers, process.env);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.data));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
        });

        server.middlewares.use('/api/progress/events', async (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }

          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            let body: unknown;
            try {
              body = bodyStr ? JSON.parse(bodyStr) : {};
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
              return;
            }

            const { handleLearningEvent } = await server.ssrLoadModule('/api/progress/events.ts');
            const result = await handleLearningEvent(body, req.headers, process.env);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.data));
          });
        });

        server.middlewares.use('/api/progress', async (req, res) => {
          if (req.method === 'GET') {
            try {
              const result = await handleGetProgress(req.headers, process.env);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.data));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
            return;
          }

          if (req.method === 'POST' || req.method === 'PUT') {
            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });

            req.on('end', async () => {
              try {
                const body = bodyStr ? JSON.parse(bodyStr) : {};
                const result = await handleSaveProgress(body, req.headers, process.env);
                res.statusCode = result.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.data));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, error: String(err) }));
              }
            });
            return;
          }

          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
        });

        server.middlewares.use('/api/shorts', async (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }

          try {
            const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
            const topic = url.searchParams.get('topic') || 'all';
            const pageToken = url.searchParams.get('pageToken') || '';
            const limit = Number(url.searchParams.get('limit')) || 8;
            const result = await handleGetShorts({ topic, pageToken, limit }, req.headers, process.env);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.data));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: 'Failed to fetch shorts' }));
          }
        });
      },
    },
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
