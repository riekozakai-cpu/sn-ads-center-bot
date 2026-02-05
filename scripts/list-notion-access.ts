/**
 * Notion Integrationがアクセス可能なページ/DBを一覧表示
 * 実行: pnpm tsx scripts/list-notion-access.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from '@notionhq/client';

// .env.local を手動で読み込む
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        let value = valueParts.join('=');
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
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

async function main() {
  console.log('=== Integrationがアクセス可能なコンテンツ一覧 ===\n');

  const notion = new Client({
    auth: process.env.NOTION_API_KEY,
  });

  try {
    // 空のクエリで検索（アクセス可能な全てを取得）
    const response = await notion.search({
      page_size: 20,
    });

    console.log(`見つかったアイテム: ${response.results.length}件\n`);

    for (const item of response.results) {
      const obj = item as any;

      if (obj.object === 'database') {
        // データベースの場合
        const title = obj.title?.[0]?.plain_text || 'Untitled Database';
        console.log(`[DATABASE] ${title}`);
        console.log(`  ID: ${obj.id}`);
        console.log(`  URL: ${obj.url}`);
        console.log('');
      } else if (obj.object === 'page') {
        // ページの場合
        let title = 'Untitled';
        if (obj.properties) {
          for (const [, prop] of Object.entries(obj.properties)) {
            const p = prop as any;
            if (p.type === 'title' && p.title?.length > 0) {
              title = p.title.map((t: any) => t.plain_text).join('');
              break;
            }
          }
        }
        console.log(`[PAGE] ${title}`);
        console.log(`  ID: ${obj.id}`);
        console.log(`  URL: ${obj.url}`);
        console.log('');
      }
    }

    if (response.results.length === 0) {
      console.log('⚠️  アクセス可能なコンテンツがありません');
      console.log('   → Integrationにページ/データベースを接続してください');
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

main();
