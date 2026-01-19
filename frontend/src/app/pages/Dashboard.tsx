import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { StatsOverview } from '../components/StatsOverview';
import { FilterBar } from '../components/FilterBar';
import { IPOCard } from '../components/IPOCard';
import { RecentListings } from '../components/RecentListings';
import { LoginModal } from '../components/LoginModal';
import { AllListings } from '../components/AllListings';
import { mergeIPOs, mapScraperDataToUI, normalizeName } from '../utils/ipoUtils';
import { buildApiUrl, API_CONFIG } from '../config/api';

// TypeScript interface for IPO data
interface IPO {
    name: string;
    sector: string;
    priceRange: string;
    lotSize: number;
    gmp: number;
    gmpPercent: number;
    subscription: string;
    openDate: string;
    closeDate: string;
    status: 'open' | 'upcoming' | 'closed';
    listingDate: string;
    values: Record<string, any>;
    url?: string;
    groww_url?: string;
    raw_html?: any;
    logo?: string;
    listingPrice?: string;
    price?: string;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('all');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [ipos, setIpos] = useState<IPO[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    useEffect(() => {
        // Check for existing session
        const storedEmail = localStorage.getItem('userEmail');
        if (storedEmail) {
            setUserEmail(storedEmail);
            setIsAuthenticated(true);
        }

        // Fetch IPOs with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.IPOS), { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                clearTimeout(timeoutId);
                if (Array.isArray(data)) {
                    const mergedData = mergeIPOs(data);
                    const mappedData = mapScraperDataToUI(mergedData);
                    setIpos(mappedData);
                }
                setLoading(false);
            })
            .catch(err => {
                clearTimeout(timeoutId);
                // Silent error handling - just set loading to false
                setLoading(false);
            });
    }, []);

    const filteredIPOs = ipos.filter((ipo) => {
        const matchesFilter = activeFilter === 'all' || ipo.status === activeFilter;
        const matchesSearch = ipo.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
        return matchesFilter && matchesSearch;
    }).sort((a, b) => {
        // Helper to parse dates
        const parseDate = (dateStr: string) => {
            if (!dateStr || dateStr === 'TBA') return null;
            const cleaned = dateStr.replace(/ T$/, '').trim();
            const d = new Date(cleaned);
            return isNaN(d.getTime()) ? null : d;
        };

        // Sort by status priority first (open > upcoming > closed)
        const statusPriority: Record<string, number> = { open: 1, upcoming: 2, closed: 3 };
        const aPriority = statusPriority[a.status] || 999;
        const bPriority = statusPriority[b.status] || 999;

        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }

        // Within same status, sort by relevant date
        if (a.status === 'upcoming') {
            // Sort by open date (ascending - soonest first)
            const aDate = parseDate(a.openDate);
            const bDate = parseDate(b.openDate);
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return aDate.getTime() - bDate.getTime();
        } else if (a.status === 'open') {
            // Sort by close date (ascending - closing soonest first)
            const aDate = parseDate(a.closeDate);
            const bDate = parseDate(b.closeDate);
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return aDate.getTime() - bDate.getTime();
        } else {
            // Closed: Sort by listing date (descending - most recent first)
            const aDate = parseDate(a.listingDate);
            const bDate = parseDate(b.listingDate);
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return bDate.getTime() - aDate.getTime();
        }
    });

    const handleLogout = () => {
        localStorage.removeItem('userEmail');
        setIsAuthenticated(false);
        setUserEmail('');
    };

    const handleLoginSuccess = () => {
        const email = localStorage.getItem('userEmail') || '';
        setUserEmail(email);
        setIsAuthenticated(true);
        setIsLoginModalOpen(false);
    };

    const [currentView, setCurrentView] = useState<'home' | 'all-listings'>('home');

    if (currentView === 'all-listings') {
        return (
            <AllListings
                onBack={() => setCurrentView('home')}
                userEmail={userEmail}
                isAuthenticated={isAuthenticated}
                onLoginClick={() => setIsLoginModalOpen(true)}
                onLogout={handleLogout}
            />
        );
    }

    // --- Stats Calculation Logic ---
    const parseSub = (str: any) => {
        if (!str || typeof str !== 'string' || str === 'TBA') return null;
        const clean = str.replace(/[xX\%]/g, '').trim();
        const val = parseFloat(clean);
        return isNaN(val) ? null : val;
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const getIPOsInDateRange = (start: Date, end: Date) => {
        return ipos.filter(ipo => {
            // Use Listing Date preferred, or Close Date
            const dateStr = ipo.listingDate !== 'TBA' ? ipo.listingDate : ipo.closeDate;
            if (!dateStr || dateStr === 'TBA') return false;

            const cleanDate = dateStr.replace(/ T$/, '').trim();
            const d = new Date(cleanDate);
            if (isNaN(d.getTime())) return false;
            return d >= start && d <= end;
        });
    };

    const currentMonthIPOs = getIPOsInDateRange(thirtyDaysAgo, now);
    const prevMonthIPOs = getIPOsInDateRange(sixtyDaysAgo, thirtyDaysAgo);

    const calcAvg = (items: any[]) => {
        let sum = 0;
        let count = 0;
        for (const i of items) {
            const s = parseSub(i.subscription);
            if (s !== null) {
                sum += s;
                count++;
            }
        }
        return count === 0 ? 0 : sum / count;
    };

    const currentAvg = calcAvg(currentMonthIPOs);
    const prevAvg = calcAvg(prevMonthIPOs);

    const avgSubStr = currentAvg > 0 ? `${currentAvg.toFixed(1)}x` : (currentAvg === 0 && currentMonthIPOs.length > 0 ? '0x' : 'N/A');

    let subTrendStr = '-';
    const baselineRaw = prevAvg > 0 ? prevAvg : 1.0;
    const currentRaw = currentAvg;

    const baseline = parseFloat(baselineRaw.toFixed(1));
    const current = parseFloat(currentRaw.toFixed(1));

    if (current >= 0) {
        const diff = ((current - baseline) / baseline) * 100;
        const sign = diff >= 0 ? '+' : '';
        subTrendStr = `${sign}${diff.toFixed(0)}% from last month`;
    } else {
        subTrendStr = 'Insufficient data';
    }


    // --- Positive Listing Calculation ---
    let positiveCount = 0;
    let totalListedThisMonth = 0;

    for (const ipo of ipos) {
        const cleanDate = ipo.listingDate ? ipo.listingDate.replace(/ T$/, '').trim() : '';
        if (!cleanDate) continue;

        const d = new Date(cleanDate);
        if (isNaN(d.getTime())) continue;

        const sameMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        const isListed = d <= now;

        if (sameMonth && isListed) {
            totalListedThisMonth++;
            // Get listing price from values object
            const listPriceStr = ipo.values['listing at'] || ipo.values['listing price'] || '0';
            const listPrice = parseFloat(listPriceStr.replace(/[^\d.]/g, ''));

            // Get issue price from price band (take upper band)
            const priceBand = ipo.values['price band'] || ipo.values['issue price'] || '0';
            const priceParts = priceBand.split('-');
            const issuePrice = parseFloat(priceParts[priceParts.length - 1].replace(/[^\d.]/g, ''));

            if (listPrice > 0 && issuePrice > 0 && listPrice > issuePrice) {
                positiveCount++;
            }
        }
    }

    const positiveListingStr = totalListedThisMonth > 0
        ? `${Math.round((positiveCount / totalListedThisMonth) * 100)}% positive listing`
        : 'No listings yet';
    // -------------------------------

    return (
        <div className="min-h-screen bg-background">
            <Header
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isAuthenticated={isAuthenticated}
                onLoginClick={() => setIsLoginModalOpen(true)}
                onLogout={handleLogout}
                userEmail={userEmail}
            />

            <main className="container mx-auto px-6 py-8">
                {/* Stats Overview */}
                <div className="mb-8">
                    <StatsOverview
                        activeCount={loading ? 0 : ipos.filter(ipo => ipo.status === 'open').length}
                        activeThisWeek={loading ? 0 : ipos.filter(ipo => {
                            const openDate = new Date(ipo.openDate);
                            if (isNaN(openDate.getTime())) return false;

                            const now = new Date();
                            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                            const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));

                            openDate.setHours(0, 0, 0, 0);
                            startOfWeek.setHours(0, 0, 0, 0);
                            endOfWeek.setHours(23, 59, 59, 999);

                            return openDate >= startOfWeek && openDate <= endOfWeek;
                        }).length}
                        upcomingCount={loading ? 0 : ipos.filter(ipo => ipo.status === 'upcoming').length}
                        listedCount={loading ? 0 : ipos.filter(ipo => {
                            if (!ipo.listingDate || ipo.listingDate === 'TBA') return false;
                            const cleanDate = ipo.listingDate.replace(/ T$/, '').trim();
                            const d = new Date(cleanDate);
                            const now = new Date();
                            if (isNaN(d.getTime())) return false;
                            const sameMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                            const isListed = d <= now;
                            return sameMonth && isListed;
                        }).length}
                        avgSubscription={loading ? 'Loading...' : avgSubStr}
                        subscriptionTrend={loading ? '-' : subTrendStr}
                        positiveListingText={loading ? 'Loading...' : positiveListingStr}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - IPO List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold mb-1 text-foreground">
                                    Current & Upcoming IPOs
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {filteredIPOs.length} IPO{filteredIPOs.length !== 1 ? 's' : ''} found
                                </p>
                            </div>
                        </div>

                        <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />

                        {loading ? (
                            <div className="text-center py-12 text-muted-foreground">Loading IPO details...</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredIPOs.map((ipo) => (
                                    <IPOCard
                                        key={ipo.name}
                                        {...ipo}
                                        onViewDetails={() => navigate('/ipo/' + normalizeName(ipo.name))}
                                    />
                                ))}
                            </div>
                        )}

                        {!loading && filteredIPOs.length === 0 && (
                            <div className="bg-card rounded-lg p-12 text-center border border-border">
                                <p className="text-lg font-medium mb-2 text-foreground">No IPOs found</p>
                                <p className="text-muted-foreground">Try adjusting your filters to see more results</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        <RecentListings onViewAll={() => setCurrentView('all-listings')} />
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-16 py-8 border-t border-border">
                <div className="container mx-auto px-6">
                    <div className="text-center">
                        <p className="text-sm mb-2 text-muted-foreground">IPO Radar - Indian Mainboard IPO Intelligence Platform</p>
                        <p className="text-xs text-muted-foreground/70">Data updated every 15 minutes • For informational purposes only • Not investment advice</p>
                    </div>
                </div>
            </footer>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onLogin={handleLoginSuccess}
            />
        </div>
    );
}
