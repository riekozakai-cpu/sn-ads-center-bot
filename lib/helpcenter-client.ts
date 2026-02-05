/**
 * SmartNews Ads ヘルプセンター検索クライアント
 * WordPress REST APIを使用
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
 * ヘルプセンターの記事を検索する
 * @param query 検索クエリ
 * @param maxResults 最大結果数（デフォルト: 3）
 */
export async function searchHelpCenter(
  query: string,
  maxResults: number = 3
): Promise<HelpCenterSearchResult[]> {
  try {
    const searchUrl = `${HELPCENTER_BASE_URL}/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=${maxResults}`;

    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Help Center API error: ${response.status}`);
    }

    const posts: WPPost[] = await response.json();

    return posts.map((post) => ({
      id: post.id,
      title: stripHtml(post.title.rendered),
      url: post.link,
      content: stripHtml(post.content.rendered).slice(0, 2000),
      excerpt: stripHtml(post.excerpt.rendered),
      source: 'HelpCenter' as const,
      type: 'public' as const,
    }));
  } catch (error) {
    console.error('Help Center search error:', error);
    throw error;
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
