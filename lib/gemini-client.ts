import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

/**
 * Gemini APIを使ってメッセージに応答する
 * @param userMessage ユーザーからのメッセージ
 * @param systemMessage カスタムインストラクション
 * @returns AIの応答
 */
export async function generateResponse(
  userMessage: string,
  systemMessage?: string
): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY が設定されていません');
  }

  try {
    const { text } = await generateText({
      model: google('gemini-2.0-flash'),
      system: systemMessage,
      prompt: userMessage,
    });

    return text || '応答を生成できませんでした';
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('AI応答の生成に失敗しました');
  }
}
