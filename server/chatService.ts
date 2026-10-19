/**
 * 채팅 API 공용 로직.
 * Express 서버(server.ts)와 Vercel 서버리스 함수(server/vercel/*.ts)가 함께 사용합니다.
 */
import {
  buildSystemPrompt,
  COUNSELOR_PROFILES,
  getLocalFallbackResponse,
} from '../src/config/promptConfig';
import { CounselorId } from '../src/types';
import { evaluateCrisisSignals } from '../src/utils/crisisDetector';
import { evaluateConversationRisk } from '../src/utils/conversationRisk';
import { maskPersonalInfo } from '../src/utils/personalInfo';
import { checkRateLimit, getRateLimitStatus } from './rateLimit';
import { avoidConsecutiveEmoji, chooseCrisisSafeMessage, resolveSafetyCheck } from './responsePolicy';
import { classifyGeminiError, getThinkingLevel, getTimeoutMs, withOverloadRetry } from './geminiConfig';
import { generateReply, getProviderInfo, type ChatTurn } from './aiProvider';

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

export async function getHealth(): Promise<ServiceResult> {
  return {
    status: 200,
    body: {
      status: 'ok',
      provider: getProviderInfo().name,
      hasApiKey: getProviderInfo().configured,
      model: getProviderInfo().model,
      thinkingLevel: getProviderInfo().name === 'gemini' ? getThinkingLevel() : undefined,
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

  // AI 응답을 쓸 수 없을 때(키 없음·한도 초과·오류)는 최근 대화 흐름까지 본 규칙 판단으로 내장 응답
  const conversationRisk = evaluateConversationRisk(cleanMessage, conversationHistory);
  const localFallback = () =>
    getLocalFallbackResponse(validCounselorId, cleanMessage, conversationRisk.riskLevel, {
      safetyCheck: conversationRisk.needsSafetyCheck,
    });

  try {
    const provider = getProviderInfo();

    // AI 연결 정보가 없으면 내장 응답 엔진 사용
    if (!provider.configured) {
      const fallback = localFallback();
      return { status: 200, body: { ...fallback, source: 'local_engine' } };
    }

    // 요청 한도 초과 시 오류 대신 내장 응답으로 대체 (위기 안내는 항상 제공)
    const limit = await checkRateLimit(clientIp);
    if (limit.limited) {
      console.warn('Rate limited:', limit.reason);
      const fallback = localFallback();
      return { status: 200, body: { ...fallback, source: 'rate_limited' } };
    }

    // 2. AI 호출 (AI_PROVIDER 환경변수로 제공자 선택)
    const profile = COUNSELOR_PROFILES[validCounselorId];

    const recentHistory: ChatTurn[] = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-MAX_HISTORY_TURNS).map((m: any) => ({
          role: m?.sender === 'user' ? 'user' : 'assistant',
          // 전화번호·이메일 등은 AI 서비스로 보내기 전에 가림
          text: maskPersonalInfo(String(m?.text || '').slice(0, MAX_MESSAGE_LENGTH)),
        }))
      : [];

    const dynamicSystemPrompt = buildSystemPrompt(validCounselorId);

    // 서버 과부하(5xx) 때는 한 번 재시도 (같은 제한 시간 안에서)
    const responseText = await withOverloadRetry(
      (signal) =>
        generateReply({
          system: dynamicSystemPrompt,
          history: recentHistory,
          userText: `학생의 메시지: "${maskPersonalInfo(cleanMessage)}"
이 학생의 고민을 경청하고 차분하게 마음을 정리할 수 있도록 응답을 JSON 형식으로 작성해 줘.`,
          signal,
        }),
      { timeoutMs: getTimeoutMs() }
    );

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

    // 모델이 더 낮게 판단해도 규칙 기반 판정(현재 메시지·최근 대화 흐름)보다 낮아지지 않게 함
    // 예: 확인 질문 뒤 간접 신호가 다시 나오면 모델이 또 질문하더라도 위기로 안내
    const finalRiskLevel = maxRisk(
      maxRisk(parsedData.riskLevel, heuristicCheck.riskLevel),
      conversationRisk.riskLevel
    );

    // 위기 키워드가 있으면 확인 질문 없이 즉시 안내, 간접 신호면 확인 질문 턴으로 처리
    // (모델이 확인 질문을 하고도 safetyCheck를 빠뜨리는 경우가 있어 규칙 판단으로 보완)
    const { safetyCheck, shouldOfferReferral } = resolveSafetyCheck({
      finalRiskLevel,
      heuristicRiskLevel: heuristicCheck.riskLevel,
      modelSafetyCheck: parsedData.safetyCheck === true || conversationRisk.needsSafetyCheck,
      modelOfferReferral: parsedData.shouldOfferReferral,
    });

    // 규칙으로 위기가 됐는데 모델은 위기로 보지 않았다면, 가벼운 답변 대신 캐릭터별 차분한 위기 안내
    const crisisFallback = getLocalFallbackResponse(validCounselorId, cleanMessage, 'crisis');
    const { message, overridden } = chooseCrisisSafeMessage({
      modelRiskLevel: parsedData.riskLevel,
      finalRiskLevel,
      modelMessage: avoidConsecutiveEmoji(String(parsedData.message || ''), conversationHistory),
      crisisMessage: crisisFallback.message,
    });

    return {
      status: 200,
      body: {
        message,
        suggestedKeywords: overridden ? crisisFallback.suggestedKeywords : keywords,
        riskLevel: finalRiskLevel,
        counselorNote: parsedData.counselorNote || '',
        shouldOfferReferral,
        safetyCheck,
        referralStage: finalRiskLevel === 'crisis' ? 3 : parsedData.referralStage || 2,
        source: overridden ? `${provider.name}_rule_crisis` : provider.name,
      },
    };
  } catch (error) {
    // 실패 사유를 분류해 로그(Vercel Logs)와 응답(fallbackReason)에 남김. 학생 메시지 내용은 기록하지 않음
    const fallbackReason = classifyGeminiError(error);
    const status = (error as { status?: unknown } | null)?.status;
    console.error(
      `[ai_fallback] provider=${getProviderInfo().name} reason=${fallbackReason} model=${getProviderInfo().model} status=${status ?? '-'}`,
      error instanceof Error ? error.message.slice(0, 500) : error
    );

    // 어떤 오류가 나도 학생의 대화가 끊기지 않도록 내장 응답으로 복구
    const fallback = localFallback();
    return { status: 200, body: { ...fallback, source: 'fallback_recovery', fallbackReason } };
  }
}
