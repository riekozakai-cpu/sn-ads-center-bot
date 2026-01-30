import crypto from 'crypto';

/**
 * Slack署名を検証する
 * @param signingSecret Slackのシークレット
 * @param requestSignature リクエストヘッダーのx-slack-signature
 * @param timestamp リクエストヘッダーのx-slack-request-timestamp
 * @param body リクエストボディ（生の文字列）
 * @returns 検証が成功すればtrue
 */
export function verifySlackRequest(
  signingSecret: string,
  requestSignature: string,
  timestamp: string,
  body: string
): boolean {
  // タイムスタンプが5分以上古い場合はリプレイ攻撃の可能性があるため拒否
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    return false;
  }

  // Slackの署名フォーマット: v0:{timestamp}:{body}
  const sigBasestring = `v0:${timestamp}:${body}`;

  // HMAC SHA256でハッシュ化
  const mySignature = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex')}`;

  // 定数時間比較でタイミング攻撃を防ぐ
  return crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(requestSignature, 'utf8')
  );
}
