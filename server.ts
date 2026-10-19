import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getHealth, processChat } from './server/chatService';
import { getClientIp } from './server/rateLimit';
import { listFeedback, saveFeedback } from './server/feedbackService';

/**
 * 로컬 개발(`npm run dev`) 및 일반 Node 호스팅(`npm start`)용 Express 서버.
 * Vercel 배포에서는 이 파일 대신 api/*.js 서버리스 함수가 사용됩니다.
 */
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

app.use(express.json({ limit: '50kb' }));

app.get('/api/health', async (_req, res) => {
  const { status, body } = await getHealth();
  res.status(status).json(body);
});

app.post('/api/chat', async (req, res) => {
  const { status, body } = await processChat(req.body, getClientIp(req.headers));
  res.status(status).json(body);
});

app.post('/api/feedback', async (req, res) => {
  const { status, body } = await saveFeedback(req.body, getClientIp(req.headers));
  res.status(status).json(body);
});

app.get('/api/feedback', async (req, res) => {
  const { status, body } = await listFeedback(req.headers.authorization);
  res.status(status).json(body);
});

// Mount Vite or serve static files
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[서초 청소년 마음상담 서버] 실행 중: http://localhost:${PORT}`);
  });
}

startServer();
