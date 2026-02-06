import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

/**
 * ユーザーの質問文から検索キーワードを抽出する
 * WordPress REST APIの検索に適した短いキーワードに変換
 * @param question ユーザーの質問文
 * @returns スペース区切りの検索キーワード
 */
export async function extractSearchKeywords(question: string): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // APIキーがない場合はそのまま返す
    return question;
  }

  try {
    const { text } = await generateText({
      model: google('gemini-2.0-flash'),
      system: `あなたは検索キーワード抽出アシスタントです。
ユーザーの質問文から、ヘルプセンター記事を検索するための重要なキーワードを抽出してください。

ルール：
- 2〜4個のキーワードをスペース区切りで出力する
- 助詞（は、を、が、に、で、の等）や丁寧語（ください、ですか等）は除去する
- 名詞・動詞の原形のみ残す
- 出力はキーワードのみ。説明や記号は不要`,
      prompt: question,
    });

    const keywords = (text || '').trim();
    console.log(`🔑 キーワード抽出: "${question}" → "${keywords}"`);
    return keywords || question;
  } catch (error) {
    console.error('Keyword extraction error:', error);
    return question;
  }
}

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
