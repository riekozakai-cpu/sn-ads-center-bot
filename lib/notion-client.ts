/**
 * Notion API クライアント
 * 接続済みページをキーワード検索する
 */

import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export interface NotionSearchResult {
  title: string;
  url: string;
  content: string;
  source: 'Notion';
  type: 'internal';
  lastEdited: string;
}

/**
 * Notionページを検索する
 * @param query 検索クエリ
 * @param maxResults 最大結果数（デフォルト: 5）
 */
export async function searchNotionPages(
  query: string,
  maxResults: number = 5
): Promise<NotionSearchResult[]> {
  try {
    // より多くの候補を取得してから絞り込む
    const response = await notion.search({
      query: query,
      filter: {
        property: 'object',
        value: 'page',
      },
      page_size: Math.min(maxResults * 3, 20), // 候補を多めに取得
    });

    const results: NotionSearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

    for (const page of response.results) {
      if (page.object !== 'page') continue;

      // ページのタイトルを取得
      const title = extractPageTitle(page);

      // ページのURLを取得
      const url = 'url' in page ? page.url : '';

      // ページの最終編集日時
      const lastEdited = 'last_edited_time' in page ? page.last_edited_time : '';

      // ページの内容を取得（ブロックを読み取り）
      const content = await getPageContent(page.id);

      results.push({
        title,
        url,
        content,
        source: 'Notion',
        type: 'internal',
        lastEdited,
      });
    }

    // クエリとの関連性でスコアリングして並び替え
    const scored = results.map(result => {
      const titleLower = result.title.toLowerCase();
      const contentLower = result.content.toLowerCase();
      let score = 0;

      for (const word of queryWords) {
        if (titleLower.includes(word)) score += 10;
        if (contentLower.includes(word)) score += 1;
      }

      return { result, score };
    });

    // スコア順にソートして上位を返す
    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ result }) => result);
  } catch (error) {
    console.error('Notion search error:', error);
    throw error;
  }
}

/**
 * ページタイトルを抽出する
 */
function extractPageTitle(page: any): string {
  // propertiesからタイトルを探す
  if (page.properties) {
    // 'title' または 'Name' プロパティを探す
    for (const [key, value] of Object.entries(page.properties)) {
      const prop = value as any;
      if (prop.type === 'title' && prop.title?.length > 0) {
        return prop.title.map((t: any) => t.plain_text).join('');
      }
    }
  }

  return 'Untitled';
}

/**
 * ページのコンテンツを取得する
 * @param pageId ページID
 */
async function getPageContent(pageId: string): Promise<string> {
  try {
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100, // より多くのブロックを取得
    });

    const textParts: string[] = [];

    for (const block of blocks.results) {
      const text = extractTextFromBlock(block);
      if (text) {
        textParts.push(text);
      }

      // 子ブロックがある場合は再帰的に取得（1階層のみ）
      const blockAny = block as any;
      if (blockAny.has_children && textParts.join('\n').length < 1500) {
        try {
          const childBlocks = await notion.blocks.children.list({
            block_id: block.id,
            page_size: 20,
          });
          for (const childBlock of childBlocks.results) {
            const childText = extractTextFromBlock(childBlock);
            if (childText) {
              textParts.push('  ' + childText);
            }
          }
        } catch {
          // 子ブロック取得に失敗しても続行
        }
      }
    }

    // 最大2500文字に制限
    const content = textParts.join('\n');
    return content.slice(0, 2500);
  } catch (error) {
    console.error(`Failed to get content for page ${pageId}:`, error);
    return '';
  }
}

/**
 * ブロックからテキストを抽出する
 */
function extractTextFromBlock(block: any): string {
  const blockType = block.type;
  const blockData = block[blockType];

  if (!blockData) return '';

  // rich_textを持つブロックタイプ（paragraph, heading, list items, etc.）
  if (blockData.rich_text) {
    const text = blockData.rich_text
      .map((rt: any) => rt.plain_text)
      .join('');

    // 見出しの場合はマーカーを付ける
    if (blockType.startsWith('heading_')) {
      return `【${text}】`;
    }
    // リストの場合
    if (blockType === 'bulleted_list_item' || blockType === 'numbered_list_item') {
      return `• ${text}`;
    }
    return text;
  }

  // テーブルセルなど特殊なケース
  if (blockType === 'table_row' && blockData.cells) {
    return blockData.cells
      .map((cell: any) =>
        cell.map((rt: any) => rt.plain_text).join('')
      )
      .join(' | ');
  }

  // コードブロック
  if (blockType === 'code' && blockData.rich_text) {
    return blockData.rich_text.map((rt: any) => rt.plain_text).join('');
  }

  // Callout、Quote
  if ((blockType === 'callout' || blockType === 'quote') && blockData.rich_text) {
    return blockData.rich_text.map((rt: any) => rt.plain_text).join('');
  }

  return '';
}

/**
 * Notion APIの接続テスト
 */
export async function testNotionConnection(): Promise<boolean> {
  // 空のクエリで検索してAPIが動作するか確認
  await notion.search({
    query: '',
    page_size: 1,
  });
  return true;
}
