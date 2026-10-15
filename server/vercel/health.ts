/**
 * Vercel 서버리스 함수 진입점: GET /api/health
 * `npm run build:api`가 api/health.js 로 번들링합니다.
 */
import { getHealth } from '../chatService';

export default async function handler(_req: any, res: any) {
  const { status, body } = await getHealth();
  res.status(status).json(body);
}
