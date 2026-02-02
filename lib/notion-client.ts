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
    const response = await notion.search({
      query: query,
      filter: {
        property: 'object',
        value: 'page',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
      page_size: maxResults,
    });

    const results: NotionSearchResult[] = [];

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

    return results;
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
      page_size: 50, // 最初の50ブロックを取得
    });

    const textParts: string[] = [];

    for (const block of blocks.results) {
      const text = extractTextFromBlock(block);
      if (text) {
        textParts.push(text);
      }
    }

    // 最大2000文字に制限
    const content = textParts.join('\n');
    return content.slice(0, 2000);
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

  // rich_textを持つブロックタイプ
  if (blockData.rich_text) {
    return blockData.rich_text
      .map((rt: any) => rt.plain_text)
      .join('');
  }

  // テーブルセルなど特殊なケース
  if (blockType === 'table_row' && blockData.cells) {
    return blockData.cells
      .map((cell: any) =>
        cell.map((rt: any) => rt.plain_text).join('')
      )
      .join(' | ');
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
