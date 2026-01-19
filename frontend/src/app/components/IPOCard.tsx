import { Calendar, TrendingUp, Users, IndianRupee, ExternalLink } from 'lucide-react';
import { Badge } from './ui/badge';

interface IPOCardProps {
  name: string;
  logo?: string;
  sector: string;
  priceRange: string;
  lotSize: number;
  gmp: number;
  gmpPercent: number;
  subscription: string;
  openDate: string;
  closeDate: string;
  status: 'open' | 'upcoming' | 'closed';
  listingDate?: string;
}

export function IPOCard({
  name,
  logo,
  sector,
  priceRange,
  lotSize,
  gmp,
  gmpPercent,
  subscription,
  openDate,
  closeDate,
  status,
  listingDate,
  onViewDetails
}: IPOCardProps & { onViewDetails: () => void }) {
  const statusColors = {
    open: { bg: '#DCFCE7', text: '#16A34A', border: '#16A34A' },
    upcoming: { bg: '#DBEAFE', text: '#2563EB', border: '#2563EB' },
    closed: { bg: 'var(--muted)', text: 'var(--muted-foreground)', border: 'var(--muted-foreground)' }
  };

  const statusLabels = {
    open: 'Open Now',
    upcoming: 'Upcoming',
    closed: 'Closed'
  };

  return (
    <div
      className="bg-card rounded-lg p-6 border border-border hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {logo ? (
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white border border-border overflow-hidden">
              <img src={logo} alt={name} className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center bg-muted border border-border"
            >
              <span className="text-lg font-semibold text-primary">
                {name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold mb-1 text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground">{sector}</p>
          </div>
        </div>

        <div
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: statusColors[status].bg,
            color: statusColors[status].text
          }}
        >
          {statusLabels[status]}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs mb-1 text-muted-foreground">Price Range</p>
          <p className="font-semibold text-foreground">{priceRange}</p>
        </div>
        <div>
          <p className="text-xs mb-1 text-muted-foreground">Lot Size</p>
          <p className="font-semibold text-foreground">{lotSize} shares</p>
        </div>
        <div>
          <p className="font-semibold" style={{ color: gmp >= 0 ? '#16A34A' : '#DC2626' }}>
            ₹{gmp} ({gmpPercent >= 0 ? '+' : ''}{gmpPercent.toFixed(2)}%)
          </p>
        </div>
        <div>
          <p className="text-xs mb-1 text-muted-foreground">Subscription</p>
          <p className="font-semibold text-foreground">{subscription}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs mb-3 pb-3 border-b border-border text-muted-foreground">
        <Calendar className="w-3.5 h-3.5" />
        <span>{openDate} - {closeDate}</span>
        {listingDate && (
          <>
            <span className="mx-1">•</span>
            <span>Listing: {listingDate}</span>
          </>
        )}
      </div>

      <button
        onClick={onViewDetails}
        className="w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors bg-primary text-primary-foreground hover:opacity-90"
      >
        View Details
      </button>
    </div >
  );
}