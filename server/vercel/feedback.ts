/**
 * Vercel 서버리스 함수 진입점: /api/feedback
 *   POST: 앱 평가·피드백 저장 / GET: 교사용 조회 (Authorization: Bearer FEEDBACK_ADMIN_TOKEN)
 * `npm run build:api`가 api/feedback.js 로 번들링합니다.
 */
import { listFeedback, saveFeedback } from '../feedbackService';
import { getClientIp } from '../rateLimit';

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    const { status, body } = await saveFeedback(req.body, getClientIp(req.headers));
    return res.status(status).json(body);
  }
  if (req.method === 'GET') {
    const { status, body } = await listFeedback(req.headers?.authorization);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json(body);
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
