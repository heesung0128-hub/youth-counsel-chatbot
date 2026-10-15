/**
 * Vercel 서버리스 함수 진입점: POST /api/chat
 * `npm run build:api`가 api/chat.js 로 번들링합니다.
 */
import { processChat } from '../chatService';
import { getClientIp } from '../rateLimit';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { status, body } = await processChat(req.body, getClientIp(req.headers));
  res.status(status).json(body);
}
