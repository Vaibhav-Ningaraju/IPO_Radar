import { TrendingUp, Calendar, Activity, Target } from 'lucide-react';

interface StatsOverviewProps {
  activeCount: number;
  activeThisWeek: number;
  upcomingCount: number;
  listedCount: number;
  avgSubscription: string;
  subscriptionTrend: string;
  positiveListingText: string;
}

export function StatsOverview({ activeCount, activeThisWeek, upcomingCount, listedCount, avgSubscription, subscriptionTrend, positiveListingText }: StatsOverviewProps) {
  const stats = [
    {
      icon: Activity,
      label: 'Active IPOs',
      value: activeCount.toString(),
      change: activeThisWeek > 0 ? `+${activeThisWeek} this week` : '',
      positive: true
    },
    {
      icon: Calendar,
      label: 'Upcoming',
      value: upcomingCount.toString(),
      change: 'Next 30 days',
      positive: null
    },
    {
      icon: Target,
      label: 'Avg. Subscription',
      value: avgSubscription,
      change: subscriptionTrend,
      positive: subscriptionTrend.startsWith('+')
    },
    {
      icon: TrendingUp,
      label: 'Listed this Month',
      value: listedCount.toString(),
      change: positiveListingText,
      positive: true
    }
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-card rounded-lg p-6 border border-border"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-xs mb-1 text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold mb-1 text-foreground">{stat.value}</p>
                {stat.change && (
                  <p
                    className="text-xs"
                    style={{
                      color: stat.positive === true ? '#16A34A' : stat.positive === false ? '#DC2626' : 'var(--muted-foreground)'
                    }}
                  >
                    {stat.change}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}