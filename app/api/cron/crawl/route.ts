import { NextRequest, NextResponse } from 'next/server';
import { crawlAndCacheHelpCenter, getCacheMetadata } from '@/lib/helpcenter-cache';

/**
 * Help Center クローリングエンドポイント
 * Vercel Cronから毎日実行される
 */
export async function GET(request: NextRequest) {
  // CRON_SECRETによる認証（Vercel Cronでは自動的にAuthorizationヘッダーが付与される）
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // ローカル開発時はCRON_SECRETがない場合はスキップ
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await crawlAndCacheHelpCenter();

    if (result.success) {
      const metadata = await getCacheMetadata();
      return NextResponse.json({
        success: true,
        message: 'Help Center cache updated',
        articleCount: result.articleCount,
        breakdown: result.breakdown,
        lastUpdated: metadata?.lastUpdated,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Cron crawl error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
