import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  COUNSELOR_SYSTEM_INSTRUCTION,
  COUNSELOR_PROFILES,
  getLocalFallbackResponse,
} from './src/config/promptConfig';
import { CounselorId } from './src/types';
import { evaluateCrisisSignals } from './src/utils/crisisDetector';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize GoogleGenAI SDK on server-side only
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!apiKey,
    timestamp: new Date().toISOString(),
  });
});

/**
 * AI Counselor Chat endpoint
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { counselorId, userMessage, conversationHistory, anonymousId } = req.body;

    const validCounselorId: CounselorId =
      counselorId === 'cat' || counselorId === 'dog' || counselorId === 'monkey'
        ? counselorId
        : 'cat';

    const cleanMessage = typeof userMessage === 'string' ? userMessage.trim() : '';

    if (!cleanMessage) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // 1. First-pass deterministic server-side safety check
    const heuristicCheck = evaluateCrisisSignals(cleanMessage);

    // If no API client or key, provide high-quality fallback
    if (!aiClient) {
      const fallback = getLocalFallbackResponse(
        validCounselorId,
        cleanMessage,
        heuristicCheck.riskLevel
      );
      return res.json({
        ...fallback,
        source: 'local_engine',
      });
    }

    // 2. Call Gemini model (gemini-3.8-flash)
    const profile = COUNSELOR_PROFILES[validCounselorId];

    // Format chat history context (last 8 turns for tight conversational relevance)
    const recentHistory = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-8).map((m: any) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: String(m.text || '') }],
        }))
      : [];

    const dynamicSystemPrompt = `${COUNSELOR_SYSTEM_INSTRUCTION}
현재 함께 이야기할 마음 친구 캐릭터는 '${profile.name}' (${profile.species})입니다.
캐릭터 특징: ${profile.personality}
기본 슬로건: "${profile.tagline}"
답변 시 선생님이 아닌 다정하고 든든한 친구 '${profile.name}'의 어조를 자연스럽게 유지하세요.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
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
        temperature: 0.7,
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
          },
          required: ['message', 'suggestedKeywords', 'riskLevel'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from model');
    }

    const parsedData = JSON.parse(responseText);

    // Ensure suggestedKeywords has exactly 3 items
    let keywords: [string, string, string] = profile.defaultKeywords;
    if (
      Array.isArray(parsedData.suggestedKeywords) &&
      parsedData.suggestedKeywords.length >= 3
    ) {
      keywords = [
        parsedData.suggestedKeywords[0] || '고민이 있어',
        parsedData.suggestedKeywords[1] || '내 이야기 들어줄래?',
        parsedData.suggestedKeywords[2] || '나 요즘 힘들어',
      ];
    }

    // Safety override: if heuristic detected crisis, enforce riskLevel as 'crisis'
    let finalRiskLevel = parsedData.riskLevel;
    if (heuristicCheck.riskLevel === 'crisis') {
      finalRiskLevel = 'crisis';
    }

    return res.json({
      message: parsedData.message,
      suggestedKeywords: keywords,
      riskLevel: finalRiskLevel,
      counselorNote: parsedData.counselorNote || '',
      shouldOfferReferral:
        parsedData.shouldOfferReferral ??
        (finalRiskLevel === 'crisis' || finalRiskLevel === 'concern'),
      referralStage:
        parsedData.referralStage || (finalRiskLevel === 'crisis' ? 3 : 2),
      source: 'gemini',
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);

    // In case of any error, safely fallback so student is never interrupted
    const { counselorId, userMessage } = req.body;
    const heuristicCheck = evaluateCrisisSignals(userMessage || '');
    const fallback = getLocalFallbackResponse(
      counselorId || 'cat',
      userMessage || '',
      heuristicCheck.riskLevel
    );

    return res.json({
      ...fallback,
      source: 'fallback_recovery',
    });
  }
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
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[서초 청소년 마음상담 서버] 실행 중: http://localhost:${PORT}`);
  });
}

startServer();
