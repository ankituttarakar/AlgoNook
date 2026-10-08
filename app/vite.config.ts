import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import 'dotenv/config'
import { handleSyncUser } from './api/sync-user'
import { handleGetProgress, handleSaveProgress } from './api/progress'
import { handleExecuteCode } from './api/code/execute'

// https://vite.dev/config/
export default defineConfig({
  base: './',
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
});
