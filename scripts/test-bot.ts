/**
 * ボットの応答精度をローカルでテストするスクリプト
 * 使い方: npx tsx scripts/test-bot.ts "質問内容"
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const SYSTEM_PROMPT = `あなたはSmartNews Adsの問い合わせ対応FAQボットです。

## ルール
- 提供された情報を元に適切な回答を導いてください
- 推測で回答は考えないでください
- 情報が見つからない場合は正直に「該当する情報が見つかりませんでした」と伝えてください
- 口調は丁寧・簡潔。箇条書きを多用してください
- 参考にしたNotionページがあれば、URLを含めてください`;

async function testBot(query: string) {
  // 環境変数読み込み後に動的import
  const { generateResponse } = await import('../lib/gemini-client');
  const { searchNotionPages } = await import('../lib/notion-client');
  const { searchHelpCenter } = await import('../lib/helpcenter-client');

  console.log('━'.repeat(50));
  console.log('📝 質問:', query);
  console.log('━'.repeat(50));

  let context = '';

  // ヘルプセンター検索
  console.log('\n🔍 ヘルプセンター検索中...');
  try {
    const helpResults = await searchHelpCenter(query, 3);
    if (helpResults.length > 0) {
      console.log(`✅ ${helpResults.length}件の記事を発見\n`);
      helpResults.forEach((article, i) => {
        console.log(`  ${i + 1}. ${article.title}`);
        console.log(`     URL: ${article.url}`);
        console.log('');
      });
      context += '\n\n【参考情報（ヘルプセンター）】\n' + helpResults.map((article, i) =>
        `${i + 1}. ${article.title}\nURL: ${article.url}\n内容: ${article.content.slice(0, 500)}...`
      ).join('\n\n');
    } else {
      console.log('⚠️  関連記事が見つかりませんでした');
    }
  } catch (error) {
    console.error('❌ ヘルプセンター検索エラー:', error);
  }

  // Notion検索
  console.log('\n🔍 Notion検索中...');
  try {
    const notionResults = await searchNotionPages(query, 3);
    if (notionResults.length > 0) {
      console.log(`✅ ${notionResults.length}件の関連ページを発見\n`);
      notionResults.forEach((page, i) => {
        console.log(`  ${i + 1}. ${page.title}`);
        console.log(`     URL: ${page.url}`);
        console.log('');
      });
      context += '\n\n【参考情報（Notion - 社内）】\n' + notionResults.map((page, i) =>
        `${i + 1}. ${page.title}\nURL: ${page.url}\n内容: ${page.content.slice(0, 500)}...`
      ).join('\n\n');
    } else {
      console.log('⚠️  関連ページが見つかりませんでした');
    }
  } catch (error) {
    console.error('❌ Notion検索エラー:', error);
  }

  // AI応答生成
  console.log('\n🤖 AI応答を生成中...\n');
  const prompt = query + context;

  try {
    const response = await generateResponse(prompt, SYSTEM_PROMPT);
    console.log('━'.repeat(50));
    console.log('💬 ボット応答:');
    console.log('━'.repeat(50));
    console.log(response);
    console.log('━'.repeat(50));
  } catch (error) {
    console.error('❌ OpenAIエラー:', error);
  }
}

// コマンドライン引数から質問を取得
const query = process.argv[2];

if (!query) {
  console.log('使い方: npx tsx scripts/test-bot.ts "質問内容"');
  console.log('例: npx tsx scripts/test-bot.ts "広告の入稿方法を教えてください"');
  process.exit(1);
}

testBot(query);
