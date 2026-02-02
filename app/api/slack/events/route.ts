import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { generateResponse } from '@/lib/openai-client';
import { searchNotionPages } from '@/lib/notion-client';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// イベント処理用の型定義
interface SlackEvent {
  type: string;
  user?: string;
  text?: string;
  channel?: string;
  ts?: string;
  bot_id?: string;
  thread_ts?: string;
}

interface SlackEventPayload {
  type: string;
  challenge?: string;
  event?: SlackEvent;
}

// システムプロンプト
const SYSTEM_PROMPT = `あなたはSmartNews Adsの問い合わせ対応FAQボットです。

## ルール
- 提供された情報を元に適切な回答を導いてください
- 推測で回答は考えないでください
- 情報が見つからない場合は正直に「該当する情報が見つかりませんでした」と伝えてください
- 口調は丁寧・簡潔。箇条書きを多用してください
- 参考にしたNotionページがあれば、URLを含めてください`;

export async function POST(request: NextRequest) {
  // Slackのリトライは無視
  if (request.headers.get('x-slack-retry-num')) {
    return NextResponse.json({ ok: true });
  }

  try {
    // リクエストボディを取得
    const body = await request.text();
    const payload: SlackEventPayload = JSON.parse(body);

    // URL検証チャレンジ（Slack App初回設定時）
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge });
    }

    // イベント処理
    if (payload.type === 'event_callback' && payload.event) {
      const event = payload.event;

      // Bot自身のメッセージは無視
      if (event.bot_id) {
        return NextResponse.json({ ok: true });
      }

      // メンションにのみ応答（app_mention）
      if (event.type === 'app_mention' && event.text && event.channel) {
        // メンション部分を削除
        const userMessage = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

        // Notionから関連情報を検索
        let notionContext = '';
        try {
          const notionResults = await searchNotionPages(userMessage, 3);
          if (notionResults.length > 0) {
            notionContext = '\n\n【参考情報（Notion）】\n' + notionResults.map((page, i) =>
              `${i + 1}. ${page.title}\nURL: ${page.url}\n内容: ${page.content.slice(0, 500)}...`
            ).join('\n\n');
          }
        } catch (error) {
          console.error('Notion search error:', error);
        }

        // OpenAI APIで応答を生成
        const prompt = userMessage + notionContext;
        const aiResponse = await generateResponse(prompt, SYSTEM_PROMPT);

        // Slackに返信
        await slack.chat.postMessage({
          channel: event.channel,
          text: aiResponse,
          thread_ts: event.thread_ts || event.ts,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack event handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
