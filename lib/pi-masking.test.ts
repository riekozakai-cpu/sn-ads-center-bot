import { describe, it, expect } from 'vitest';
import {
  maskPersonalInfo,
  unmaskPersonalInfo,
  saveMappingToSession,
  getMappingFromSession,
  clearSessionMapping,
} from './pi-masking';

describe('PIマスキング機能', () => {
  describe('maskPersonalInfo', () => {
    it('メールアドレスをマスクする', () => {
      const input = '連絡先は tanaka@example.com です';
      const { maskedText, mapping } = maskPersonalInfo(input);

      expect(maskedText).toBe('連絡先は [EMAIL_001] です');
      expect(mapping['EMAIL_001']).toBe('tanaka@example.com');
    });

    it('複数のメールアドレスをマスクする', () => {
      const input = 'tanaka@example.com と suzuki@test.co.jp に送信';
      const { maskedText, mapping } = maskPersonalInfo(input);

      expect(maskedText).toBe('[EMAIL_001] と [EMAIL_002] に送信');
      expect(mapping['EMAIL_001']).toBe('tanaka@example.com');
      expect(mapping['EMAIL_002']).toBe('suzuki@test.co.jp');
    });

    it('電話番号をマスクする（ハイフンあり）', () => {
      const input = '電話番号は 03-1234-5678 です';
      const { maskedText, mapping } = maskPersonalInfo(input);

      expect(maskedText).toBe('電話番号は [PHONE_001] です');
      expect(mapping['PHONE_001']).toBe('03-1234-5678');
    });

    it('電話番号をマスクする（携帯）', () => {
      const input = '携帯は 090-1234-5678 です';
      const { maskedText, mapping } = maskPersonalInfo(input);

      expect(maskedText).toBe('携帯は [PHONE_001] です');
      expect(mapping['PHONE_001']).toBe('090-1234-5678');
    });

    it('人名（〜さん）をマスクする', () => {
      const input = '田中さんに連絡してください';
      const { maskedText, mapping } = maskPersonalInfo(input);

      expect(maskedText).toBe('[PERSON_001]さんに連絡してください');
      expect(mapping['PERSON_001']).toBe('田中');
    });

    it('人名（〜様）をマスクする', () => {
      const input = '山田様宛にお送りします';
      const { maskedText, mapping } = maskPersonalInfo(input);

      expect(maskedText).toBe('[PERSON_001]様宛にお送りします');
      expect(mapping['PERSON_001']).toBe('山田');
    });

    it('複合的な個人情報をマスクする', () => {
      const input = '田中さんのメールは tanaka@example.com で、電話は 03-1234-5678 です';
      const { maskedText, mapping } = maskPersonalInfo(input);

      expect(maskedText).toContain('[PERSON_001]さん');
      expect(maskedText).toContain('[EMAIL_001]');
      expect(maskedText).toContain('[PHONE_001]');
      expect(Object.keys(mapping).length).toBe(3);
    });

    it('個人情報がない場合はそのまま返す', () => {
      const input = 'これは普通のメッセージです';
      const { maskedText, mapping } = maskPersonalInfo(input);

      expect(maskedText).toBe('これは普通のメッセージです');
      expect(Object.keys(mapping).length).toBe(0);
    });
  });

  describe('unmaskPersonalInfo', () => {
    it('マスクされたテキストを復元する', () => {
      const maskedText = '[PERSON_001]さんのメールは [EMAIL_001] です';
      const mapping = {
        PERSON_001: '田中',
        EMAIL_001: 'tanaka@example.com',
      };

      const result = unmaskPersonalInfo(maskedText, mapping);
      expect(result).toBe('田中さんのメールは tanaka@example.com です');
    });

    it('マッピングが空の場合はそのまま返す', () => {
      const maskedText = 'これは普通のメッセージです';
      const mapping = {};

      const result = unmaskPersonalInfo(maskedText, mapping);
      expect(result).toBe('これは普通のメッセージです');
    });

    it('複数の同じマスクIDを復元する', () => {
      const maskedText = '[PERSON_001]さんは [PERSON_001]さんです';
      const mapping = { PERSON_001: '田中' };

      const result = unmaskPersonalInfo(maskedText, mapping);
      expect(result).toBe('田中さんは 田中さんです');
    });
  });

  describe('マスク→復元の往復テスト', () => {
    it('マスクして復元すると元に戻る', () => {
      const original = '田中さんのメールは tanaka@example.com です';
      const { maskedText, mapping } = maskPersonalInfo(original);
      const restored = unmaskPersonalInfo(maskedText, mapping);

      expect(restored).toBe(original);
    });
  });

  describe('セッション管理', () => {
    it('セッションにマッピングを保存・取得できる', () => {
      const sessionId = 'test-session-1';
      const mapping = { PERSON_001: '田中' };

      saveMappingToSession(sessionId, mapping);
      const retrieved = getMappingFromSession(sessionId);

      expect(retrieved).toEqual(mapping);
    });

    it('セッションのマッピングを削除できる', () => {
      const sessionId = 'test-session-2';
      const mapping = { PERSON_001: '田中' };

      saveMappingToSession(sessionId, mapping);
      clearSessionMapping(sessionId);
      const retrieved = getMappingFromSession(sessionId);

      expect(retrieved).toEqual({});
    });

    it('存在しないセッションはnullを返す', () => {
      const retrieved = getMappingFromSession('non-existent-session');
      expect(retrieved).toEqual({});
    });
  });
});
