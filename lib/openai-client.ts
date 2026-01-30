import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * OpenAI APIを使ってメッセージに応答する
 * GPTsのカスタムインストラクションをsystemMessageとして設定できます
 * @param userMessage ユーザーからのメッセージ
 * @param systemMessage カスタムインストラクション（GPTsで設定した内容）
 * @returns AIの応答
 */
export async function generateResponse(
  userMessage: string,
  systemMessage?: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY が設定されていません');
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  // カスタムインストラクション（GPTsのプロンプト）を設定
  if (systemMessage) {
    messages.push({
      role: 'system',
      content: systemMessage,
    });
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // コスト効率的なモデル（gpt-4oより95%安い）
      messages,
      temperature: 0.7, // 応答の創造性（0-2、低いほど決定的）
      max_tokens: 1000, // 最大トークン数
    });

    return completion.choices[0]?.message?.content || '応答を生成できませんでした';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('AI応答の生成に失敗しました');
  }
}

/**
 * 会話履歴を含めた応答生成（マルチターン会話用）
 * @param messages 会話履歴
 * @param systemMessage カスタムインストラクション
 * @returns AIの応答
 */
export async function generateResponseWithHistory(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  systemMessage?: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY が設定されていません');
  }

  const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (systemMessage) {
    allMessages.push({
      role: 'system',
      content: systemMessage,
    });
  }

  allMessages.push(...messages);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || '応答を生成できませんでした';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('AI応答の生成に失敗しました');
  }
}
