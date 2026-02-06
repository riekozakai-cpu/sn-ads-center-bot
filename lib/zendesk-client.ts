// Zendesk チケット検索クライアント

interface ZendeskTicket {
  id: number;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  url: string;
}

interface ZendeskSearchResult {
  results: Array<{
    id: number;
    subject: string;
    description: string;
    status: string;
    created_at: string;
    url: string;
  }>;
  count: number;
}

export interface TicketResult {
  id: number;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  url: string;
}

const ZENDESK_SUBDOMAIN = 'smartnews-ads';
const ZENDESK_API_BASE = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2`;

/**
 * Zendeskのチケットを検索する
 */
export async function searchZendeskTickets(
  query: string,
  limit: number = 3
): Promise<TicketResult[]> {
  const email = process.env.ZENDESK_EMAIL;
  const apiToken = process.env.ZENDESK_API_TOKEN;

  if (!email || !apiToken) {
    console.warn('Zendesk credentials not configured');
    return [];
  }

  // Basic認証用のトークンを作成（email/token:api_token）
  const authToken = Buffer.from(`${email}/token:${apiToken}`).toString('base64');

  // 検索クエリを構築（チケットタイプで絞り込み、解決済みも含む）
  const searchQuery = encodeURIComponent(`type:ticket ${query}`);
  const url = `${ZENDESK_API_BASE}/search.json?query=${searchQuery}&sort_by=relevance&per_page=${limit}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Zendesk API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: ZendeskSearchResult = await response.json();

    return data.results.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject || '(件名なし)',
      description: ticket.description || '',
      status: translateStatus(ticket.status),
      createdAt: formatDate(ticket.created_at),
      url: `https://${ZENDESK_SUBDOMAIN}.zendesk.com/agent/tickets/${ticket.id}`,
    }));
  } catch (error) {
    console.error('Zendesk search error:', error);
    return [];
  }
}

/**
 * ステータスを日本語に変換
 */
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'new': '新規',
    'open': '対応中',
    'pending': '保留中',
    'hold': '保留',
    'solved': '解決済み',
    'closed': '終了',
  };
  return statusMap[status] || status;
}

/**
 * 日付をフォーマット
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
