/**
 * 検索テスト
 * 実行: pnpm tsx scripts/test-search.ts "検索キーワード"
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
  const query = process.argv[2] || '広告';

  console.log(`=== 検索テスト: 「${query}」 ===\n`);

  const { searchNotionPages } = await import('../lib/notion-client');

  const results = await searchNotionPages(query, 3);

  if (results.length === 0) {
    console.log('検索結果がありません');
    return;
  }

  results.forEach((page, i) => {
    console.log(`--- ${i + 1}. ${page.title} ---`);
    console.log(`URL: ${page.url}`);
    console.log(`内容: ${page.content.slice(0, 300)}...\n`);
  });
}

main();
