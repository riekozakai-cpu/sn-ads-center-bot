/**
 * Notionデータベースの構造を確認するスクリプト
 * 実行: pnpm tsx scripts/check-notion-db.ts
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
        // ダブルクォートを除去
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

const DATABASE_ID = 'e810cbad119346ae96ab243ad1ca8256';

async function main() {
  console.log('=== Notionデータベース構造確認 ===\n');

  const notion = new Client({
    auth: process.env.NOTION_API_KEY,
  });

  // 1. データベースのスキーマを取得
  console.log('1. データベース情報を取得中...\n');
  try {
    const database = await notion.databases.retrieve({
      database_id: DATABASE_ID,
    });

    console.log('データベース名:', (database as any).title?.[0]?.plain_text || 'N/A');
    console.log('\nプロパティ一覧:');
    console.log('---');

    const properties = (database as any).properties;
    for (const [name, prop] of Object.entries(properties)) {
      const p = prop as any;
      console.log(`  ${name}: ${p.type}`);
    }
    console.log('---\n');
  } catch (error: any) {
    console.error('データベース取得エラー:', error.message);
    console.log('\n→ Integrationにデータベースが接続されているか確認してください');
    process.exit(1);
  }

  // 2. 最初の3件のデータを取得
  console.log('2. サンプルデータ（最初の3件）を取得中...\n');
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 3,
    });

    console.log(`取得件数: ${response.results.length}件\n`);

    for (let i = 0; i < response.results.length; i++) {
      const page = response.results[i] as any;
      console.log(`--- ${i + 1}件目 ---`);
      console.log('Page ID:', page.id);
      console.log('URL:', page.url);

      // プロパティを表示
      for (const [name, prop] of Object.entries(page.properties)) {
        const p = prop as any;
        let value = '';

        if (p.type === 'title' && p.title?.length > 0) {
          value = p.title.map((t: any) => t.plain_text).join('');
        } else if (p.type === 'rich_text' && p.rich_text?.length > 0) {
          value = p.rich_text.map((t: any) => t.plain_text).join('').slice(0, 100);
        } else if (p.type === 'select' && p.select) {
          value = p.select.name;
        } else if (p.type === 'multi_select' && p.multi_select) {
          value = p.multi_select.map((s: any) => s.name).join(', ');
        } else if (p.type === 'date' && p.date) {
          value = p.date.start;
        } else if (p.type === 'checkbox') {
          value = p.checkbox ? 'true' : 'false';
        }

        if (value) {
          console.log(`  ${name}: ${value}`);
        }
      }
      console.log('');
    }
  } catch (error: any) {
    console.error('データ取得エラー:', error.message);
  }

  console.log('=== 確認完了 ===');
}

main();
