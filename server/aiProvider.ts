/**
 * 답변을 만드는 AI 제공자 선택.
 *
 * AI_PROVIDER 환경변수로 고릅니다 (기본: gemini).
 *   gemini      GEMINI_API_KEY, GEMINI_MODEL
 *   cloudflare  CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_MODEL (예: @cf/openai/gpt-oss-120b)
 *   upstage     UPSTAGE_API_KEY, UPSTAGE_MODEL (예: solar-pro2), UPSTAGE_BASE_URL (기본 https://api.upstage.ai/v1)
 *
 * Cloudflare·Upstage는 OpenAI 호환 채팅 API를 씁니다. 두 곳 모두 응답 형식(JSON 스키마) 강제 기능이
 * 확실하지 않아, 프롬프트의 JSON 지시 + 응답에서 JSON 부분만 꺼내는 방식으로 처리합니다.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { EmptyResponseError, getGeminiModel, getThinkingLevel } from './geminiConfig.ts';

export type ProviderName = 'gemini' | 'cloudflare' | 'upstage';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ProviderInfo {
  name: ProviderName;
  model: string;
  configured: boolean;
}

export function getProviderInfo(): ProviderInfo {
  const raw = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  if (raw === 'cloudflare') {
    return {
      name: 'cloudflare',
      model: process.env.CLOUDFLARE_MODEL || '@cf/openai/gpt-oss-120b',
      configured: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
    };
  }
  if (raw === 'upstage') {
    return {
      name: 'upstage',
      model: process.env.UPSTAGE_MODEL || 'solar-pro2',
      configured: !!process.env.UPSTAGE_API_KEY,
    };
  }
  return { name: 'gemini', model: getGeminiModel(), configured: !!process.env.GEMINI_API_KEY };
}

/** 모델 응답에서 JSON 객체 부분만 꺼냄 (생각 과정 태그·코드 블록·앞뒤 설명 제거) */
export function extractJson(text: string): string {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?/gi, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new SyntaxError('No JSON object in model response');
  return cleaned.slice(start, end + 1);
}

// ---------- Gemini ----------
let geminiClient: GoogleGenAI | undefined;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return geminiClient;
}

async function generateWithGemini(system: string, history: ChatTurn[], userText: string, signal: AbortSignal) {
  const response = await getGeminiClient().models.generateContent({
    model: getGeminiModel(),
    contents: [
      ...history.map((t) => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.text }] })),
      { role: 'user', parts: [{ text: userText }] },
    ],
    config: {
      systemInstruction: system,
      thinkingConfig: { thinkingLevel: getThinkingLevel() },
      abortSignal: signal,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING, description: '학생에게 전할 따뜻하고 차분한 상담사의 응답' },
          suggestedKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '학생이 바로 누를 수 있는 대화 맥락 맞춤형 다음 추천 키워드 정확히 3개',
          },
          riskLevel: { type: Type.STRING, enum: ['safe', 'concern', 'crisis'], description: '학생의 심리적 위기 수준 판단' },
          counselorNote: { type: Type.STRING, description: '상담 메모 (선택)' },
          shouldOfferReferral: { type: Type.BOOLEAN, description: '실제 상담사 또는 전문기관 연계 제안 카드를 표시할지 여부' },
          referralStage: { type: Type.INTEGER, description: '연계 단계 (2: 비대면 익명 상담사, 3: Wee클래스 및 전문기관)' },
          safetyCheck: { type: Type.BOOLEAN, description: '간접적인 위기 신호에 대해 안전 확인 질문을 한 답변이면 true' },
        },
        required: ['message', 'suggestedKeywords', 'riskLevel'],
      },
    },
  });
  if (!response.text) throw new EmptyResponseError('Empty response from model');
  return response.text;
}

// ---------- OpenAI 호환 (Cloudflare Workers AI, Upstage) ----------
function openAICompatibleTarget(info: ProviderInfo): { url: string; token: string } {
  if (info.name === 'cloudflare') {
    return {
      url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
      token: process.env.CLOUDFLARE_API_TOKEN || '',
    };
  }
  const base = (process.env.UPSTAGE_BASE_URL || 'https://api.upstage.ai/v1').replace(/\/$/, '');
  return { url: `${base}/chat/completions`, token: process.env.UPSTAGE_API_KEY || '' };
}

async function generateWithOpenAICompatible(
  info: ProviderInfo,
  system: string,
  history: ChatTurn[],
  userText: string,
  signal: AbortSignal
) {
  const { url, token } = openAICompatibleTarget(info);
  const messages = [
    { role: 'system', content: system },
    ...history.map((t) => ({ role: t.role, content: t.text })),
    { role: 'user', content: `${userText}\n응답은 위 [응답 포맷]의 JSON 객체 하나만 출력하고, 그 밖의 글은 쓰지 마.` },
  ];

  const send = async (useJsonMode: boolean) =>
    fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: info.model,
        messages,
        max_tokens: 1500,
        ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal,
    });

  let res = await send(true);
  if (res.status === 400) {
    // JSON 모드를 지원하지 않는 모델이면 JSON 모드 없이 한 번 더
    const detail = await res.text();
    if (/response_format|json/i.test(detail)) res = await send(false);
    else throw Object.assign(new Error(`HTTP 400 ${detail.slice(0, 300)}`), { status: 400 });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw Object.assign(new Error(`HTTP ${res.status} ${detail.slice(0, 300)}`), { status: res.status });
  }
  const data: any = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') throw new EmptyResponseError('Empty response from model');
  return extractJson(content);
}

/** 시스템 프롬프트·최근 대화·이번 메시지로 답변 JSON 문자열을 받아옴 */
export async function generateReply(input: {
  system: string;
  history: ChatTurn[];
  userText: string;
  signal: AbortSignal;
}): Promise<string> {
  const info = getProviderInfo();
  if (info.name === 'gemini') return generateWithGemini(input.system, input.history, input.userText, input.signal);
  return generateWithOpenAICompatible(info, input.system, input.history, input.userText, input.signal);
}
