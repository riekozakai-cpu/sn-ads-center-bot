import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

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
        // シンプルな固定メッセージで返信
        await slack.chat.postMessage({
          channel: event.channel,
          text: `こんにちは！メッセージを受け取りました: "${event.text.replace(/<@[A-Z0-9]+>/g, '').trim()}"`,
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
