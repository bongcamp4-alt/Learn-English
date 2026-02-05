
import { GoogleGenAI, Modality } from "@google/genai";
import { Level, Topic } from "../types";

// localStorage에서 API 키를 가져오는 함수
const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gemini_api_key') || '';
  }
  return '';
};

// API 키 유효성 검증 함수
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const testAi = new GoogleGenAI({ apiKey });
    await testAi.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      config: { maxOutputTokens: 5 }
    });
    return true;
  } catch (error) {
    console.error("API Key validation failed:", error);
    return false;
  }
};

// API 키 저장 함수
export const saveApiKey = (apiKey: string): void => {
  localStorage.setItem('gemini_api_key', apiKey);
};

// API 키 가져오기 함수 (외부에서 사용)
export const getSavedApiKey = (): string => {
  return getApiKey();
};

// API 키 삭제 함수
export const clearApiKey = (): void => {
  localStorage.removeItem('gemini_api_key');
};

export const getAIResponse = async (
  prompt: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  level: Level,
  topic: Topic
) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다.");
  }

  const ai = new GoogleGenAI({ apiKey });

  let levelGuidance = "";

  if (level === Level.BEGINNER) {
    levelGuidance = `
      - Use ONLY simple A1-level vocabulary and very short, clear sentences.
      - Explain corrections using very basic terms.
      - Focus on survival phrases related to ${topic}.`;
  } else if (level === Level.INTERMEDIATE) {
    levelGuidance = `
      - Use B1-B2 level vocabulary. Mix simple and complex sentences.
      - Use 1-2 common idioms or phrasal verbs related to ${topic}.
      - Focus corrections on natural phrasing and nuance.`;
  } else if (level === Level.ADVANCED) {
    levelGuidance = `
      - Use C1-C2 level vocabulary and sophisticated structures.
      - Focus on professional or high-level social tone.
      - Corrections should focus on advanced style and flow.`;
  }

  const systemInstruction = `You are an expert English Teacher. 
  Current Student Level: ${level}
  Conversation Topic: ${topic}
  
  Rules:
  ${levelGuidance}
  - ALWAYS provide Korean translation for ALL English sentences you write.
  
  Format (MUST follow this exact format):
  1. Main English Response (your teaching response in English)
  2. 💡 Correction: (Optional - only if student made grammar/vocabulary mistakes)
  3. 🇰🇷 번역: (REQUIRED - translate ALL your English sentences above into natural Korean. This is MANDATORY for every response.)
  
  Always end your English response with a question to continue the conversation.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.95,
      }
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('500')) {
      throw new Error("AI 서버 일시적 오류입니다. 잠시 후 다시 시도해 주세요.");
    }
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key not valid')) {
      throw new Error("API 키가 유효하지 않습니다. 설정에서 올바른 키를 입력해주세요.");
    }
    throw error;
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore') => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  // 텍스트에서 영어 본문만 추출 (💡 또는 🇰🇷 이전 내용)
  const mainText = text.split('💡')[0].split('🇰🇷')[0].split('번역:')[0].trim();

  if (!mainText) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: mainText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};
