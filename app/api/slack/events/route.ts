import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { verifySlackRequest } from '@/lib/slack-verification';
import { generateResponse } from '@/lib/openai-client';
import { maskPersonalInfo, unmaskPersonalInfo } from '@/lib/pi-masking';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// GPTsのカスタムインストラクションをここに設定
// GPTsで設定したプロンプトをそのまま貼り付けてください
const CUSTOM_INSTRUCTIONS = `あなたは親切なアシスタントです。
ユーザーの質問に対して、わかりやすく丁寧に回答してください。`;

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
  try {
    // リクエストボディを取得
    const body = await request.text();
    const payload: SlackEventPayload = JSON.parse(body);

    // URL検証チャレンジ（Slack App初回設定時）
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge });
    }

    // Slack署名検証（セキュリティ対策）
    const signature = request.headers.get('x-slack-signature');
    const timestamp = request.headers.get('x-slack-request-timestamp');
    const signingSecret = process.env.SLACK_SIGNING_SECRET;

    if (!signature || !timestamp || !signingSecret) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const isValid = verifySlackRequest(signingSecret, signature, timestamp, body);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // イベント処理
    if (payload.type === 'event_callback' && payload.event) {
      const event = payload.event;

      // Bot自身のメッセージは無視
      if (event.bot_id) {
        return NextResponse.json({ ok: true });
      }

      // メンション or ダイレクトメッセージに応答
      if (
        (event.type === 'app_mention' || event.type === 'message') &&
        event.text &&
        event.channel
      ) {
        // メンション部分を削除（@BotName を取り除く）
        const userMessage = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

        // PIマスキング: 個人情報をマスクしてからOpenAIに送信
        const { maskedText, mapping } = maskPersonalInfo(userMessage);

        // OpenAI APIで応答を生成（マスク済みテキストを送信）
        const aiResponse = await generateResponse(maskedText, CUSTOM_INSTRUCTIONS);

        // PI復元: OpenAIの応答に含まれるマスクIDを元の値に戻す
        const unmaskedResponse = unmaskPersonalInfo(aiResponse, mapping);

        // Slackに返信（復元済みテキスト）
        await slack.chat.postMessage({
          channel: event.channel,
          text: unmaskedResponse,
          thread_ts: event.thread_ts || event.ts, // スレッド内で返信
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
