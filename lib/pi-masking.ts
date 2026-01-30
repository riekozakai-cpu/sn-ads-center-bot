/**
 * PIマスキング機能
 * 個人情報をマスクして、OpenAI APIに送信する前に保護する
 */

export interface MaskMapping {
  [key: string]: string; // 例: {"PERSON_001": "田中太郎"}
}

export interface MaskResult {
  maskedText: string;
  mapping: MaskMapping;
}

/**
 * 個人情報をマスクする
 * @param text マスク対象のテキスト
 * @param sessionId セッションID（マッピング管理用）
 * @returns マスクされたテキストとマッピング情報
 */
export function maskPersonalInfo(text: string, sessionId?: string): MaskResult {
  let maskedText = text;
  const mapping: MaskMapping = {};
  let personCounter = 1;
  let emailCounter = 1;
  let phoneCounter = 1;

  // 1. メールアドレスのマスク
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
  maskedText = maskedText.replace(emailRegex, (match) => {
    const maskId = `EMAIL_${String(emailCounter).padStart(3, '0')}`;
    mapping[maskId] = match;
    emailCounter++;
    return `[${maskId}]`;
  });

  // 2. 電話番号のマスク（日本の形式）
  const phoneRegex = /0\d{1,4}-\d{1,4}-\d{4}|0\d{9,10}/g;
  maskedText = maskedText.replace(phoneRegex, (match) => {
    const maskId = `PHONE_${String(phoneCounter).padStart(3, '0')}`;
    mapping[maskId] = match;
    phoneCounter++;
    return `[${maskId}]`;
  });

  // 3. 人名のマスク（簡易版：「〜さん」「〜様」「〜氏」「〜殿」の前の名前）
  // 本番環境ではNER（固有表現認識）ライブラリの使用を推奨
  // 注: 「〜の」パターンは誤検出が多いため除外
  const namePattern = /([一-龯ぁ-んァ-ヶー]{2,4})\s*(さん|様|氏|殿)/g;

  maskedText = maskedText.replace(namePattern, (match, name, suffix) => {
    const maskId = `PERSON_${String(personCounter).padStart(3, '0')}`;
    mapping[maskId] = name;
    personCounter++;
    return `[${maskId}]${suffix}`;
  });

  // 4. 住所のマスク（簡易版）
  const addressRegex = /[一-龯ぁ-んァ-ヶー]{2,3}[都道府県][一-龯ぁ-んァ-ヶー]{1,10}[市区町村][一-龯ぁ-んァ-ヶー0-9\-]+/g;
  let addressCounter = 1;
  maskedText = maskedText.replace(addressRegex, (match) => {
    const maskId = `ADDRESS_${String(addressCounter).padStart(3, '0')}`;
    mapping[maskId] = match;
    addressCounter++;
    return `[${maskId}]`;
  });

  return {
    maskedText,
    mapping,
  };
}

/**
 * マスクされたテキストを元に戻す
 * @param maskedText マスクされたテキスト
 * @param mapping マスク時に生成されたマッピング情報
 * @returns 復元されたテキスト
 */
export function unmaskPersonalInfo(
  maskedText: string,
  mapping: MaskMapping
): string {
  let unmaskedText = maskedText;

  // マッピングを使って復元
  Object.entries(mapping).forEach(([maskId, originalValue]) => {
    const maskPattern = new RegExp(`\\[${maskId}\\]`, 'g');
    unmaskedText = unmaskedText.replace(maskPattern, originalValue);
  });

  return unmaskedText;
}

/**
 * Notion APIから取得したデータのPIマスク
 * @param notionData Notionから取得したデータ
 * @returns マスクされたデータとマッピング情報
 */
export function maskNotionData(notionData: string): MaskResult {
  // Notionデータにも同じマスク処理を適用
  return maskPersonalInfo(notionData);
}

/**
 * セッション管理用のマッピングストア（メモリ内）
 * 本番環境ではRedis等の外部ストアを推奨
 */
const sessionMappings = new Map<string, MaskMapping>();

/**
 * セッションIDに紐づくマッピングを保存
 */
export function saveMappingToSession(
  sessionId: string,
  mapping: MaskMapping
): void {
  const existingMapping = sessionMappings.get(sessionId) || {};
  sessionMappings.set(sessionId, { ...existingMapping, ...mapping });
}

/**
 * セッションIDに紐づくマッピングを取得
 */
export function getMappingFromSession(sessionId: string): MaskMapping | null {
  return sessionMappings.get(sessionId) || null;
}

/**
 * セッション終了時にマッピングを削除
 */
export function clearSessionMapping(sessionId: string): void {
  sessionMappings.delete(sessionId);
}

/**
 * 古いセッションマッピングを定期的にクリア（メモリリーク防止）
 * 本番環境では、セッションに有効期限を設定してRedisで管理することを推奨
 */
export function clearExpiredMappings(maxAgeMs: number = 3600000): void {
  // 実装例: タイムスタンプを保存して、古いものを削除
  // 簡易版のため省略
}
