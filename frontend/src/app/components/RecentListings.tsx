import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { buildApiUrl, API_CONFIG } from '../config/api';

interface RecentListing {
  name: string;
  symbol: string;
  price: number;
  changePercent: number; // daily change from yahoo
  listingPrice: number;
  issuePrice: number;
  listingDate?: string; // We might need to fetch this or rely on backend to provide formatted date
}

interface RecentListingsProps {
  onViewAll?: () => void;
}

export function RecentListings({ onViewAll }: RecentListingsProps) {
  const [listings, setListings] = useState<RecentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = () => {
      fetch(buildApiUrl(API_CONFIG.ENDPOINTS.LIVE_LISTINGS))
        .then(res => res.json())
        .then(data => {
          setListings(data);
          setLoading(false);
          setLastUpdated(new Date());
        })
        .catch(err => {
          console.error("Failed to fetch live listings:", err);
          setLoading(false);
        });
    };

    fetchData(); // Initial fetch
    const intervalId = setInterval(fetchData, 15000); // Poll every 15 seconds

    return () => clearInterval(intervalId); // Cleanup
  }, []);

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="mb-6">
        <h3 className="font-semibold mb-1 text-foreground">Recent Listings</h3>
        <div className="flex justify-between items-end">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground/70">
              Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-4">No recent listings found</div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing, index) => {
            // Calculate Total Gain from Issue Price
            const totalGain = listing.issuePrice > 0
              ? ((listing.price - listing.issuePrice) / listing.issuePrice) * 100
              : 0;
            const isPositive = totalGain >= 0;

            return (
              <div
                key={index}
                className="pb-4 border-b border-border last:border-b-0 last:pb-0"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold mb-1 text-foreground">{listing.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {listing.symbol !== 'N/A' ? listing.symbol : 'Ticker not found'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4" style={{ color: '#16A34A' }} />
                    ) : (
                      <TrendingDown className="w-4 h-4" style={{ color: '#DC2626' }} />
                    )}
                    <span
                      className="text-sm font-semibold"
                      style={{ color: isPositive ? '#16A34A' : '#DC2626' }}
                    >
                      {isPositive ? '+' : ''}{totalGain.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs mb-0.5 text-muted-foreground">Issue Price</p>
                    <p className="text-sm font-medium text-foreground">₹{listing.issuePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5 text-muted-foreground">Listing</p>
                    <p className="text-sm font-medium text-foreground">
                      {listing.listingPrice > 0 ? `₹${listing.listingPrice.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5 text-muted-foreground">Current</p>
                    <p className="text-sm font-medium text-foreground">₹{listing.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full mt-4 py-2 px-4 rounded-lg text-sm font-medium transition-colors bg-muted text-muted-foreground border border-border hover:bg-muted/80 hover:text-foreground"
        >
          View All Listings
        </button>
      )}
    </div>
  );
}