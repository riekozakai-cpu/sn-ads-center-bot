/**
 * Help Center キャッシュ管理モジュール
 * Vercel KVを使用してHelp Center記事をキャッシュ
 */

import { kv } from '@vercel/kv';
import { HelpCenterSearchResult, searchHelpCenter } from './helpcenter-client';

const HELPCENTER_BASE_URL = 'https://help-ads.smartnews.com';

// KVキー
const KV_ARTICLES_KEY = 'helpcenter:articles';
const KV_METADATA_KEY = 'helpcenter:metadata';

export interface CacheMetadata {
  lastUpdated: string;
  articleCount: number;
  breakdown: {
    posts: number;
    news: number;
    faq: number;
  };
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

// 投稿タイプの定義
type PostType = 'posts' | 'news' | 'faq';
const POST_TYPES: PostType[] = ['posts', 'news', 'faq'];

/**
 * 指定した投稿タイプの全記事を取得（ページネーション対応）
 */
async function fetchPostsByType(postType: PostType): Promise<HelpCenterSearchResult[]> {
  const allPosts: HelpCenterSearchResult[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${HELPCENTER_BASE_URL}/wp-json/wp/v2/${postType}?per_page=${perPage}&page=${page}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 400) {
        // ページが存在しない場合は終了
        break;
      }
      throw new Error(`Help Center API error (${postType}): ${response.status}`);
    }

    const posts: WPPost[] = await response.json();

    if (posts.length === 0) {
      break;
    }

    const mappedPosts = posts.map((post) => ({
      id: post.id,
      title: stripHtml(post.title.rendered),
      url: post.link,
      content: stripHtml(post.content.rendered).slice(0, 2000),
      excerpt: stripHtml(post.excerpt.rendered),
      source: 'HelpCenter' as const,
      type: 'public' as const,
      postType, // 投稿タイプを追加
    }));

    allPosts.push(...mappedPosts);

    // 次のページがあるか確認
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
    if (page >= totalPages) {
      break;
    }

    page++;
  }

  return allPosts;
}

/**
 * WordPress APIから全投稿タイプの記事を取得
 */
async function fetchAllHelpCenterPosts(): Promise<{
  articles: HelpCenterSearchResult[];
  breakdown: { posts: number; news: number; faq: number };
}> {
  const breakdown = { posts: 0, news: 0, faq: 0 };
  const allArticles: HelpCenterSearchResult[] = [];

  for (const postType of POST_TYPES) {
    console.log(`Fetching ${postType}...`);
    const articles = await fetchPostsByType(postType);
    breakdown[postType] = articles.length;
    allArticles.push(...articles);
    console.log(`  -> ${articles.length} items`);
  }

  return { articles: allArticles, breakdown };
}

/**
 * Help Center記事をクローリングしてKVにキャッシュ
 */
export async function crawlAndCacheHelpCenter(): Promise<{
  success: boolean;
  articleCount: number;
  breakdown?: { posts: number; news: number; faq: number };
  error?: string;
}> {
  try {
    console.log('Starting Help Center crawl...');

    const { articles, breakdown } = await fetchAllHelpCenterPosts();

    console.log(`Fetched ${articles.length} total articles from Help Center`);
    console.log(`  posts: ${breakdown.posts}, news: ${breakdown.news}, faq: ${breakdown.faq}`);

    // KVに保存
    await kv.set(KV_ARTICLES_KEY, articles);

    const metadata: CacheMetadata = {
      lastUpdated: new Date().toISOString(),
      articleCount: articles.length,
      breakdown,
    };
    await kv.set(KV_METADATA_KEY, metadata);

    console.log('Help Center cache updated successfully');

    return {
      success: true,
      articleCount: articles.length,
      breakdown,
    };
  } catch (error) {
    console.error('Help Center crawl error:', error);
    return {
      success: false,
      articleCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * キャッシュから記事を検索
 * キャッシュがない場合はリアルタイム検索にフォールバック
 */
export async function searchCachedHelpCenter(
  query: string,
  maxResults: number = 3
): Promise<HelpCenterSearchResult[]> {
  try {
    const articles = await kv.get<HelpCenterSearchResult[]>(KV_ARTICLES_KEY);

    if (!articles || articles.length === 0) {
      console.log('Cache empty, falling back to real-time search');
      return searchHelpCenter(query, maxResults);
    }

    // 簡易的な検索（タイトルと本文でクエリにマッチするものを抽出）
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

    const scored = articles.map((article) => {
      const titleLower = article.title.toLowerCase();
      const contentLower = article.content.toLowerCase();

      let score = 0;

      for (const word of queryWords) {
        // タイトルに含まれる場合は高スコア
        if (titleLower.includes(word)) {
          score += 10;
        }
        // 本文に含まれる場合
        if (contentLower.includes(word)) {
          score += 1;
        }
      }

      return { article, score };
    });

    // スコア順にソートして上位を返す
    const results = scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ article }) => article);

    return results;
  } catch (error) {
    console.error('Cache search error, falling back to real-time search:', error);
    return searchHelpCenter(query, maxResults);
  }
}

/**
 * キャッシュのメタデータを取得
 */
export async function getCacheMetadata(): Promise<CacheMetadata | null> {
  try {
    return await kv.get<CacheMetadata>(KV_METADATA_KEY);
  } catch (error) {
    console.error('Get cache metadata error:', error);
    return null;
  }
}
