/**
 * Notion API 接続テスト
 * 実行: pnpm tsx scripts/test-notion.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local を手動で読み込む
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error('.env.local の読み込みに失敗しました');
  }
}

loadEnv();

// 環境変数を読み込んだ後にインポート
async function main() {
  console.log('=== Notion API 接続テスト ===\n');

  // 1. API_KEYの確認
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.error('❌ NOTION_API_KEY が設定されていません');
    process.exit(1);
  }
  console.log('✅ NOTION_API_KEY: 設定済み\n');

  // 動的インポート
  const { searchNotionPages, testNotionConnection } = await import('../lib/notion-client');

  // 2. 接続テスト
  console.log('接続テスト中...');
  try {
    const isConnected = await testNotionConnection();
    if (!isConnected) {
      console.error('❌ Notion APIへの接続に失敗しました');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Notion APIへの接続に失敗しました');
    console.error('エラー詳細:', error?.message || error);
    if (error?.code) {
      console.error('エラーコード:', error.code);
    }
    process.exit(1);
  }
  console.log('✅ Notion APIに接続成功\n');

  // 3. 検索テスト
  console.log('検索テスト中（キーワード: "テスト"）...\n');
  try {
    const results = await searchNotionPages('テスト', 3);

    if (results.length === 0) {
      console.log('⚠️  検索結果が0件でした');
      console.log('   → 接続したページに「テスト」を含むものがないか、');
      console.log('   → ページへのIntegration接続が必要かもしれません\n');
    } else {
      console.log(`✅ ${results.length}件のページが見つかりました:\n`);
      results.forEach((page, i) => {
        console.log(`--- ${i + 1}. ${page.title} ---`);
        console.log(`   URL: ${page.url}`);
        console.log(`   最終更新: ${page.lastEdited}`);
        console.log(`   内容プレビュー: ${page.content.slice(0, 100)}...`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ 検索中にエラーが発生:', error);
    process.exit(1);
  }

  console.log('=== テスト完了 ===');
}

main();
