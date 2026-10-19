/**
 * 답변을 만드는 AI: OpenAI Responses API (POST /v1/responses)
 *
 * - 응답 형식은 JSON 스키마(Structured Outputs, strict)로 강제합니다.
 * - store: false 로 보내 OpenAI에 대화 상태가 저장되지 않게 합니다.
 *   (OpenAI는 API 데이터를 기본적으로 학습에 쓰지 않으며, 오남용 모니터링 로그는 최대 30일 보관)
 * - 설정 값은 aiConfig.ts 참고 (OPENAI_API_KEY, OPENAI_MODEL, OPENAI_REASONING_EFFORT, OPENAI_BASE_URL)
 */
import {
  EmptyResponseError,
  RefusalError,
  getOpenAIBaseUrl,
  getOpenAIModel,
  getReasoningEffort,
} from './aiConfig.ts';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ProviderInfo {
  name: 'openai';
  model: string;
  configured: boolean;
}

export function getProviderInfo(): ProviderInfo {
  return { name: 'openai', model: getOpenAIModel(), configured: !!process.env.OPENAI_API_KEY?.trim() };
}

/** 상담 답변 JSON 스키마 (strict 모드: 모든 항목 필수, 정의되지 않은 항목 금지) */
export const COUNSELOR_REPLY_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', description: '학생에게 전할 캐릭터의 답변' },
    suggestedKeywords: {
      type: 'array',
      items: { type: 'string' },
      description: '학생이 바로 누를 수 있는 다음 추천 키워드 정확히 3개 (각 10자 이내, 반말)',
    },
    riskLevel: { type: 'string', enum: ['safe', 'concern', 'crisis'], description: '학생의 심리적 위기 수준' },
    counselorNote: { type: 'string', description: '내부 메모 (없으면 빈 문자열)' },
    shouldOfferReferral: { type: 'boolean', description: '상담 기관 연계 카드를 표시할지' },
    referralStage: { type: 'integer', enum: [2, 3], description: '연계 단계 (2: 1388 비대면 상담, 3: Wee클래스·전문기관)' },
    safetyCheck: { type: 'boolean', description: '간접적인 위기 신호에 대해 안전 확인 질문을 한 답변이면 true' },
  },
  required: ['message', 'suggestedKeywords', 'riskLevel', 'counselorNote', 'shouldOfferReferral', 'referralStage', 'safetyCheck'],
  additionalProperties: false,
} as const;

/** Responses API 요청 본문 (테스트하기 쉽게 따로 만듦) */
export function buildOpenAIRequest(input: { system: string; history: ChatTurn[]; userText: string }) {
  const effort = getReasoningEffort();
  return {
    model: getOpenAIModel(),
    input: [
      { role: 'system', content: input.system },
      ...input.history.map((t) => ({ role: t.role, content: t.text })),
      { role: 'user', content: input.userText },
    ],
    store: false,
    reasoning: { effort },
    max_output_tokens: effort === 'none' || effort === 'low' ? 2000 : 6000,
    text: {
      format: { type: 'json_schema', name: 'counselor_reply', strict: true, schema: COUNSELOR_REPLY_SCHEMA },
    },
  };
}

/** Responses API 응답에서 답변 JSON 문자열을 꺼냄 (거절·잘림·빈 응답은 오류로) */
export function parseOpenAIResponse(data: any): string {
  if (data?.status === 'incomplete') {
    throw new EmptyResponseError(`Incomplete response: ${data?.incomplete_details?.reason ?? 'unknown'}`);
  }
  let text = '';
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === 'refusal') throw new RefusalError(String(part.refusal ?? 'refused'));
      if (part?.type === 'output_text' && typeof part.text === 'string') text += part.text;
    }
  }
  if (!text && typeof data?.output_text === 'string') text = data.output_text;
  if (!text.trim()) throw new EmptyResponseError('Empty response from model');
  return text;
}

/** 시스템 프롬프트·최근 대화·이번 메시지로 답변 JSON 문자열을 받아옴 */
export async function generateReply(input: {
  system: string;
  history: ChatTurn[];
  userText: string;
  signal: AbortSignal;
}): Promise<string> {
  const res = await fetch(`${getOpenAIBaseUrl()}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY?.trim() ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildOpenAIRequest(input)),
    signal: input.signal,
  });
  if (!res.ok) {
    // 오류 본문에는 학생 메시지가 없으므로 원인 파악용으로 앞부분만 남김
    const detail = await res.text().catch(() => '');
    throw Object.assign(new Error(`HTTP ${res.status} ${detail.slice(0, 300)}`), { status: res.status });
  }
  return parseOpenAIResponse(await res.json());
}
