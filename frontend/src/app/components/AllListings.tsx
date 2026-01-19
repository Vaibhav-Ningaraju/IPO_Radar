import { useState, useEffect } from 'react';
import { Header } from './Header';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { buildApiUrl, API_CONFIG } from '../config/api';

interface Listing {
    name: string;
    symbol: string;
    price: number;
    changePercent: number;
    listingPrice: number;
    issuePrice: number;
}

interface AllListingsProps {
    onBack: () => void;
    // We need props for Header? Or just render Header with defaults?
    // Header needs props. We can mock them or pass them down?
    // Let's replicate strict props for Header or modify Header to be optional.
    // Actually, we can just pass dummy props to Header since it's "All Listings" view.
    userEmail: string;
    isAuthenticated: boolean;
    onLoginClick: () => void;
    onLogout: () => void;
}

export function AllListings({ onBack, userEmail, isAuthenticated, onLoginClick, onLogout }: AllListingsProps) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        const fetchData = () => {
            fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.LIVE_LISTINGS}?all=true`))
                .then(res => res.json())
                .then(data => {
                    setListings(data);
                    setLoading(false);
                    setLastUpdated(new Date());
                })
                .catch(err => {
                    console.error("Failed to fetch all listings:", err);
                    setLoading(false);
                });
        };

        fetchData();
        const intervalId = setInterval(fetchData, 15000); // Poll every 15 seconds

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header
                searchQuery=""
                onSearchChange={() => { }}
                isAuthenticated={isAuthenticated}
                onLoginClick={onLoginClick}
                onFixDataClick={() => { }}
                onLogout={onLogout}
                userEmail={userEmail}
            />

            <main className="container mx-auto px-6 py-8">
                <button
                    onClick={onBack}
                    className="flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </button>

                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold">All Market Listings</h1>
                    <div className="text-sm text-muted-foreground text-right">
                        <div>Showing {listings.length} listings</div>
                        {lastUpdated && (
                            <div className="text-xs opacity-70 mt-1">
                                Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading market data...</div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No active listings found.</div>
                ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Symbol</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Issue Price</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Listing Price</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Price</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Gain</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {listings.map((item, idx) => {
                                        const gain = ((item.price - item.issuePrice) / item.issuePrice) * 100;
                                        const isPositive = gain > 0;
                                        const isZero = gain === 0;

                                        return (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-foreground">{item.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                    {item.symbol}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-muted-foreground">
                                                    {item.issuePrice > 0 ? `₹${item.issuePrice.toFixed(2)}` : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    {item.listingPrice > 0 ? `₹${item.listingPrice.toFixed(2)}` : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    ₹{item.price.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isPositive
                                                        ? 'bg-green-500/10 text-green-500' // green-500 equivalent color
                                                        : isZero
                                                            ? 'bg-gray-500/10 text-gray-500'
                                                            : 'bg-red-500/10 text-red-500'
                                                        }`}>
                                                        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : isZero ? <Minus className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                                        {Math.abs(gain).toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
