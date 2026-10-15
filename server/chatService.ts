/**
 * 채팅 API 공용 로직.
 * Express 서버(server.ts)와 Vercel 서버리스 함수(server/vercel/*.ts)가 함께 사용합니다.
 */
import { GoogleGenAI, Type } from '@google/genai';
import {
  buildSystemPrompt,
  COUNSELOR_PROFILES,
  getLocalFallbackResponse,
} from '../src/config/promptConfig';
import { CounselorId } from '../src/types';
import { evaluateCrisisSignals } from '../src/utils/crisisDetector';
import { checkRateLimit, getRateLimitStatus } from './rateLimit';
import { avoidConsecutiveEmoji, resolveSafetyCheck } from './responsePolicy';
import {
  classifyGeminiError,
  EmptyResponseError,
  getGeminiModel,
  getThinkingLevel,
  getTimeoutMs,
} from './geminiConfig';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 8;
const RISK_ORDER = { safe: 0, concern: 1, crisis: 2 } as const;
type RiskLevel = keyof typeof RISK_ORDER;

export interface ServiceResult {
  status: number;
  body: unknown;
}

/** 모델 응답과 규칙 기반 판정 중 더 높은 위험 수준을 채택 */
function maxRisk(a: unknown, b: RiskLevel): RiskLevel {
  const modelRisk: RiskLevel = a === 'concern' || a === 'crisis' ? a : 'safe';
  return RISK_ORDER[modelRisk] >= RISK_ORDER[b] ? modelRisk : b;
}

// 서버리스 환경에서도 재사용되도록 지연 초기화 (API 키는 서버 환경변수에서만 읽음)
let aiClient: GoogleGenAI | null | undefined;
function getClient(): GoogleGenAI | null {
  if (aiClient !== undefined) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  aiClient = apiKey
    ? new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })
    : null;
  return aiClient;
}

export async function getHealth(): Promise<ServiceResult> {
  return {
    status: 200,
    body: {
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      model: getGeminiModel(),
      thinkingLevel: getThinkingLevel(),
      rateLimit: await getRateLimitStatus(),
      timestamp: new Date().toISOString(),
    },
  };
}

export async function processChat(rawBody: unknown, clientIp = 'unknown'): Promise<ServiceResult> {
  const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as Record<string, any>;
  const { counselorId, userMessage, conversationHistory } = body;

  const validCounselorId: CounselorId =
    counselorId === 'cat' || counselorId === 'dog' || counselorId === 'monkey' ? counselorId : 'cat';

  const cleanMessage =
    typeof userMessage === 'string' ? userMessage.trim().slice(0, MAX_MESSAGE_LENGTH) : '';

  if (!cleanMessage) {
    return { status: 400, body: { error: 'Message cannot be empty' } };
  }

  // 1. 서버 측 규칙 기반 1차 안전 점검
  const heuristicCheck = evaluateCrisisSignals(cleanMessage);

  try {
    const client = getClient();

    // API 키가 없으면 내장 응답 엔진 사용
    if (!client) {
      const fallback = getLocalFallbackResponse(validCounselorId, cleanMessage, heuristicCheck.riskLevel);
      return { status: 200, body: { ...fallback, source: 'local_engine' } };
    }

    // 요청 한도 초과 시 오류 대신 내장 응답으로 대체 (위기 안내는 항상 제공)
    const limit = await checkRateLimit(clientIp);
    if (limit.limited) {
      console.warn('Rate limited:', limit.reason);
      const fallback = getLocalFallbackResponse(validCounselorId, cleanMessage, heuristicCheck.riskLevel);
      return { status: 200, body: { ...fallback, source: 'rate_limited' } };
    }

    // 2. Gemini 호출 (GEMINI_MODEL 환경변수로 모델 변경 가능)
    const profile = COUNSELOR_PROFILES[validCounselorId];

    const recentHistory = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-MAX_HISTORY_TURNS).map((m: any) => ({
          role: m?.sender === 'user' ? 'user' : 'model',
          parts: [{ text: String(m?.text || '').slice(0, MAX_MESSAGE_LENGTH) }],
        }))
      : [];

    const dynamicSystemPrompt = buildSystemPrompt(validCounselorId);

    const response = await client.models.generateContent({
      model: getGeminiModel(),
      contents: [
        ...recentHistory,
        {
          role: 'user',
          parts: [
            {
              text: `학생의 메시지: "${cleanMessage}"
이 학생의 고민을 경청하고 차분하게 마음을 정리할 수 있도록 응답을 JSON 형식으로 작성해 줘.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: dynamicSystemPrompt,
        thinkingConfig: { thinkingLevel: getThinkingLevel() },
        abortSignal: AbortSignal.timeout(getTimeoutMs()),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description: '학생에게 전할 따뜻하고 차분한 상담사의 응답',
            },
            suggestedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '학생이 바로 누를 수 있는 대화 맥락 맞춤형 다음 추천 키워드 정확히 3개',
            },
            riskLevel: {
              type: Type.STRING,
              enum: ['safe', 'concern', 'crisis'],
              description: '학생의 심리적 위기 수준 판단',
            },
            counselorNote: {
              type: Type.STRING,
              description: '상담 메모 (선택)',
            },
            shouldOfferReferral: {
              type: Type.BOOLEAN,
              description: '실제 상담사 또는 전문기관 연계 제안 카드를 표시할지 여부',
            },
            referralStage: {
              type: Type.INTEGER,
              description: '연계 단계 (2: 비대면 익명 상담사, 3: Wee클래스 및 전문기관)',
            },
            safetyCheck: {
              type: Type.BOOLEAN,
              description: '간접적인 위기 신호에 대해 안전 확인 질문을 한 답변이면 true',
            },
          },
          required: ['message', 'suggestedKeywords', 'riskLevel'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new EmptyResponseError('Empty response from model');
    }

    const parsedData = JSON.parse(responseText);

    // 추천 키워드는 정확히 3개 유지
    let keywords: [string, string, string] = profile.defaultKeywords;
    if (Array.isArray(parsedData.suggestedKeywords) && parsedData.suggestedKeywords.length >= 3) {
      keywords = [
        parsedData.suggestedKeywords[0] || '고민이 있어',
        parsedData.suggestedKeywords[1] || '내 이야기 들어줄래?',
        parsedData.suggestedKeywords[2] || '나 요즘 힘들어',
      ];
    }

    // 모델이 더 낮게 판단해도 규칙 기반 판정(concern/crisis)보다 낮아지지 않게 함
    const finalRiskLevel = maxRisk(parsedData.riskLevel, heuristicCheck.riskLevel);

    // 위기 키워드가 있으면 확인 질문 없이 즉시 안내, 간접 신호면 확인 질문 턴으로 처리
    const { safetyCheck, shouldOfferReferral } = resolveSafetyCheck({
      finalRiskLevel,
      heuristicRiskLevel: heuristicCheck.riskLevel,
      modelSafetyCheck: parsedData.safetyCheck,
      modelOfferReferral: parsedData.shouldOfferReferral,
    });

    return {
      status: 200,
      body: {
        message: avoidConsecutiveEmoji(String(parsedData.message || ''), conversationHistory),
        suggestedKeywords: keywords,
        riskLevel: finalRiskLevel,
        counselorNote: parsedData.counselorNote || '',
        shouldOfferReferral,
        safetyCheck,
        referralStage: parsedData.referralStage || (finalRiskLevel === 'crisis' ? 3 : 2),
        source: 'gemini',
      },
    };
  } catch (error) {
    // 실패 사유를 분류해 로그(Vercel Logs)와 응답(fallbackReason)에 남김. 학생 메시지 내용은 기록하지 않음
    const fallbackReason = classifyGeminiError(error);
    const status = (error as { status?: unknown } | null)?.status;
    console.error(
      `[gemini_fallback] reason=${fallbackReason} model=${getGeminiModel()} status=${status ?? '-'}`,
      error instanceof Error ? error.message.slice(0, 500) : error
    );

    // 어떤 오류가 나도 학생의 대화가 끊기지 않도록 내장 응답으로 복구
    const fallback = getLocalFallbackResponse(validCounselorId, cleanMessage, heuristicCheck.riskLevel);
    return { status: 200, body: { ...fallback, source: 'fallback_recovery', fallbackReason } };
  }
}
