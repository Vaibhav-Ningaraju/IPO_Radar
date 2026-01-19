import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { buildApiUrl, API_CONFIG } from '../config/api';

const sentimentData = [
  { category: 'QIB', subscription: '68.5x', percentage: 92, color: '#16A34A' },
  { category: 'HNI', subscription: '42.8x', percentage: 75, color: '#2563EB' },
  { category: 'Retail', subscription: '12.3x', percentage: 58, color: '#F59E0B' }
];

interface MarketStatus {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  sentiment?: {
    qib: string;
    hni: string;
    retail: string;
    totalApplications: string;
    totalAmount: string;
  };
}

export function MarketSentiment() {
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // console.log("Fetching market status...");
    fetch(buildApiUrl(API_CONFIG.ENDPOINTS.MARKET_STATUS))
      .then(res => res.json())
      .then(data => {
        // console.log("Market status data:", data);
        setMarketStatus(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch market status:", err);
        setLoading(false);
      });
  }, []);

  const isBullish = marketStatus ? marketStatus.regularMarketChange >= 0 : true;
  const SentimentIcon = isBullish ? TrendingUp : TrendingDown;
  const sentimentColor = isBullish ? '#16A34A' : '#DC2626';
  const bgColor = isBullish ? '#DCFCE7' : '#FEE2E2';

  // Use backend sentiment or fallback/default
  const sentimentStats = [
    { category: 'QIB', subscription: marketStatus?.sentiment?.qib || 'N/A', percentage: 0, color: '#16A34A' },
    { category: 'HNI', subscription: marketStatus?.sentiment?.hni || 'N/A', percentage: 0, color: '#2563EB' },
    { category: 'Retail', subscription: marketStatus?.sentiment?.retail || 'N/A', percentage: 0, color: '#F59E0B' }
  ];

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold mb-1 text-foreground">Live Market Sentiment</h3>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Checking NIFTY 50...' : `NIFTY 50: ${marketStatus?.regularMarketPrice?.toFixed(2) || 'N/A'}`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ backgroundColor: bgColor }}>
            <SentimentIcon className="w-4 h-4" style={{ color: sentimentColor }} />
            <span className="text-sm font-semibold" style={{ color: sentimentColor }}>
              {isBullish ? 'Bullish' : 'Bearish'} ({marketStatus?.regularMarketChangePercent?.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {sentimentStats.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{item.category}</span>
              <span className="text-sm font-semibold" style={{ color: item.color }}>{item.subscription}</span>
            </div>
            {/* Show bar only if we have a valid percentage (which we don't for N/A) */}
            {item.subscription !== 'N/A' && (
              <div className="w-full h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
            )}
            {item.subscription === 'N/A' && (
              <div className="w-full h-1 rounded-full bg-muted/50" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-1 text-muted-foreground">Total Applications</p>
            <p className="text-lg font-semibold text-foreground">{marketStatus?.sentiment?.totalApplications || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs mb-1 text-muted-foreground">Total Amount</p>
            <p className="text-lg font-semibold text-foreground">{marketStatus?.sentiment?.totalAmount || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}