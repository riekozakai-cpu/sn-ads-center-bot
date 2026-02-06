/**
 * SmartNews Ads ヘルプセンター検索クライアント
 * WordPress REST APIを使用
 * sn-ads-chatbot と同じ仕様
 */

const HELPCENTER_BASE_URL = 'https://help-ads.smartnews.com';

export interface HelpCenterSearchResult {
  id: number;
  title: string;
  url: string;
  content: string;
  excerpt: string;
  source: 'HelpCenter';
  type: 'public';
  postType?: 'posts' | 'news' | 'faq';
}

interface WPPost {
  id: number;
  title: { rendered: string };
  link: string;
  content: { rendered: string };
  excerpt: { rendered: string };
}

/**
 * HTMLタグを除去してプレーンテキストに変換
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * URLの有効性をチェック（HEADリクエストで404などを検出）
 */
async function isUrlValid(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn(`URL有効性チェック失敗: ${url}`);
    return false;
  }
}

/**
 * ヘルプセンターの記事を検索する
 * posts, news, faq を並列で検索
 * @param query 検索クエリ
 * @param maxResults 最大結果数（デフォルト: 3）
 */
export async function searchHelpCenter(
  query: string,
  maxResults: number = 3
): Promise<HelpCenterSearchResult[]> {
  try {
    console.log(`🔍 ヘルプセンター検索: "${query}"`);
    const encodedQuery = encodeURIComponent(query);

    // 3つのエンドポイント(posts, news, faq)から並行して検索
    const endpoints = [
      { type: 'posts' as const, url: `${HELPCENTER_BASE_URL}/wp-json/wp/v2/posts?search=${encodedQuery}&per_page=${maxResults}` },
      { type: 'news' as const, url: `${HELPCENTER_BASE_URL}/wp-json/wp/v2/news?search=${encodedQuery}&per_page=${maxResults}` },
      { type: 'faq' as const, url: `${HELPCENTER_BASE_URL}/wp-json/wp/v2/faq?search=${encodedQuery}&per_page=${maxResults}` }
    ];

    const fetchPromises = endpoints.map(async endpoint => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(endpoint.url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.log(`⚠️ ${endpoint.type}検索でエラー: ${response.status}`);
          return [];
        }

        const data = await response.json() as WPPost[];
        console.log(`📄 ${endpoint.type}から${data.length}件取得`);

        return data
          .filter((post) => post && post.title && post.title.rendered)
          .map((post) => ({
            id: post.id,
            title: stripHtml(post.title.rendered),
            url: post.link,
            content: stripHtml(post.content?.rendered || '').slice(0, 2000),
            excerpt: stripHtml(post.excerpt?.rendered || ''),
            source: 'HelpCenter' as const,
            type: 'public' as const,
            postType: endpoint.type,
          }));
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error(`❌ ${endpoint.type}検索タイムアウト`);
        } else {
          console.error(`❌ ${endpoint.type}検索失敗:`, error);
        }
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const allArticles = results.flat();

    // URLで重複を除去
    const uniqueArticles = Array.from(
      new Map(allArticles.map(article => [article.url, article])).values()
    );

    // URLの有効性を並行してチェックし、無効なURLを除外
    console.log(`🔗 ${uniqueArticles.length}件のURLの有効性をチェック中...`);
    const validityChecks = await Promise.all(
      uniqueArticles.map(async (article) => ({
        article,
        isValid: await isUrlValid(article.url)
      }))
    );

    const validArticles = validityChecks
      .filter(({ isValid }) => isValid)
      .map(({ article }) => article);

    const invalidCount = uniqueArticles.length - validArticles.length;
    if (invalidCount > 0) {
      console.log(`⚠️ ${invalidCount}件の無効なURLを除外`);
    }

    console.log(`✅ ${validArticles.length}件の有効な記事を発見`);
    return validArticles.slice(0, maxResults);
  } catch (error) {
    console.error('Help Center search error:', error);
    return [];
  }
}

/**
 * 特定の記事を取得する
 * @param postId 記事ID
 */
export async function getHelpCenterPost(
  postId: number
): Promise<HelpCenterSearchResult | null> {
  try {
    const url = `${HELPCENTER_BASE_URL}/wp-json/wp/v2/posts/${postId}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Help Center API error: ${response.status}`);
    }

    const post: WPPost = await response.json();

    return {
      id: post.id,
      title: stripHtml(post.title.rendered),
      url: post.link,
      content: stripHtml(post.content.rendered).slice(0, 2000),
      excerpt: stripHtml(post.excerpt.rendered),
      source: 'HelpCenter',
      type: 'public',
    };
  } catch (error) {
    console.error('Help Center get post error:', error);
    throw error;
  }
}
