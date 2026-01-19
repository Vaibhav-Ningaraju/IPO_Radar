import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl, API_CONFIG } from '../config/api';
import { X, ExternalLink, Calendar, Info, FileText, TrendingUp, Users, PieChart, ArrowLeft, BarChart3, Newspaper, AlertTriangle } from 'lucide-react';
import { Header } from '../components/Header';
import { LoginModal } from '../components/LoginModal';
import { mergeIPOs, mapScraperDataToUI, normalizeName } from '../utils/ipoUtils';

export default function IPOPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [ipoData, setIpoData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('Chittorgarh');

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    useEffect(() => {
        const storedEmail = localStorage.getItem('userEmail');
        if (storedEmail) {
            setUserEmail(storedEmail);
            setIsAuthenticated(true);
        }

        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.IPOS))
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const mergedData = mergeIPOs(data);
                    const mappedData = mapScraperDataToUI(mergedData);
                    const found = mappedData.find(item => normalizeName(item.name) === id);
                    if (found) {
                        setIpoData(found);
                    } else {
                        setError('IPO not found');
                    }
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch IPOs:", err);
                setError('Failed to load data');
                setLoading(false);
            });
    }, [id]);

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

    if (loading) return <LoadingState />;
    if (error || !ipoData) return <ErrorState error={error} navigate={navigate} />;

    const { name, values, status, url, raw_html } = ipoData;

    // --- Data Categorization ---
    const getValuesByKeys = (keys: (string | string[])[]) => {
        const result: Record<string, string> = {};
        keys.forEach(keyOrArr => {
            const label = Array.isArray(keyOrArr) ? keyOrArr[0] : keyOrArr;
            const candidates = Array.isArray(keyOrArr) ? keyOrArr : [keyOrArr];
            for (const candidate of candidates) {
                if (values[candidate]) {
                    result[label] = values[candidate];
                    break;
                }
                const lowerCandidate = candidate.toLowerCase();
                const foundKey = Object.keys(values).find(k => k.toLowerCase() === lowerCandidate);
                if (foundKey && values[foundKey]) {
                    result[label] = values[foundKey];
                    break;
                }
            }
        });
        return result;
    };

    const detailsData = getValuesByKeys(['face value', 'price band', 'issue price', 'lot size', 'issue type', 'listing at', 'share holding pre issue', 'share holding post issue']);
    const timelineData = getValuesByKeys(['ipo date', ['listing date', 'listed on'], 'basis of allotment', 'initiation of refunds', 'credit of shares to demat']);
    const reservationData = getValuesByKeys(['qib shares offered', 'anchor investor shares offered', 'qib (ex. anchor) shares offered', 'nii (hni) shares offered', 'bnii > ₹10l', 'snii', 'retail shares offered', 'total shares offered']);
    const financialData = getValuesByKeys(['assets', 'total income', 'profit after tax', 'ebitda', 'net worth', 'reserves and surplus', 'total borrowing']);
    const objectKeys = Object.keys(values).filter(k => !isNaN(Number(k))).sort((a, b) => Number(a) - Number(b));
    const objectData = getValuesByKeys(objectKeys);

    const tabs = [
        { id: 'Chittorgarh', label: 'Chittorgarh', icon: FileText },
        { id: 'Groww', label: 'Groww', icon: TrendingUp },
        { id: 'Sptulsian', label: 'SP Tulsian', icon: Newspaper },
        { id: 'GMP', label: 'GMP (InvestorGain)', icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen bg-background">
            <Header isAuthenticated={isAuthenticated} onLoginClick={() => setIsLoginModalOpen(true)} onLogout={handleLogout} userEmail={userEmail} searchQuery="" onSearchChange={() => { }} />

            <main className="container mx-auto px-6 py-8">
                {/* Back & Header */}
                <div className="mb-8">
                    <button onClick={() => navigate('/')} className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {ipoData.logo ? (
                                <img
                                    src={ipoData.logo}
                                    alt={`${name} Logo`}
                                    className="w-16 h-16 rounded-xl border border-primary/20 object-contain bg-white"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary border border-primary/20">
                                    {name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold text-foreground">{name}</h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${status === 'open' ? 'bg-green-500/10 text-green-600 border-green-500/20' : status === 'upcoming' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-gray-500/10 text-gray-600 border-gray-500/20'}`}>
                                        {status === 'open' ? 'Open Now' : status === 'upcoming' ? 'Upcoming' : 'Closed'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">• Mainboard IPO</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar (Fixed Details) - 4 Columns */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="lg:sticky lg:top-24 space-y-6">
                            <SectionCard title="IPO Details" icon={Info}>
                                <div className="space-y-0.5">
                                    {Object.entries(detailsData).map(([k, v]) => <DetailRow key={k} label={k} value={v} />)}
                                </div>
                            </SectionCard>
                            <SectionCard title="Tentative Timetable" icon={Calendar}>
                                <div className="space-y-0.5">
                                    {Object.entries(timelineData).map(([k, v]) => <DetailRow key={k} label={k} value={v} />)}
                                </div>
                            </SectionCard>
                            <SectionCard title="References" icon={ExternalLink}>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { label: 'Chittorgarh', link: url },
                                        { label: 'Groww', link: ipoData.groww_url },
                                        { label: 'InvestorGain', link: values['investorgain_url'] },
                                        { label: 'SP Tulsian', link: values['sptulsian_url'] }
                                    ].map((ref) => (
                                        <a key={ref.label} href={ref.link || '#'} target={ref.link ? "_blank" : undefined} rel="noopener noreferrer" className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${ref.link ? 'border-border hover:bg-accent hover:text-accent-foreground shadow-sm' : 'border-border/40 bg-muted/30 text-muted-foreground/50 cursor-not-allowed'}`} onClick={(e) => !ref.link && e.preventDefault()}>
                                            <span className="font-medium">{ref.label}</span>
                                            {ref.link ? <ExternalLink className="w-3.5 h-3.5 opacity-70" /> : <span className="text-[10px] uppercase font-semibold tracking-wider opacity-60">No Link</span>}
                                        </a>
                                    ))}
                                </div>
                            </SectionCard>
                        </div>
                    </div>

                    {/* Main Content (Tabs) - 8 Columns */}
                    <div className="lg:col-span-8">
                        {/* Tab Navigation */}
                        <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl mb-6 overflow-x-auto">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
                                            ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Exclusive Tab Content */}
                        <div className="space-y-6">

                            {/* --- CHITTORGARH CONTENT --- */}
                            {activeTab === 'Chittorgarh' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Objects */}
                                    {Object.keys(objectData).length > 0 && (
                                        <SectionCard title="Objects of the Issue" icon={FileText} className="border-l-4 border-l-primary/50">
                                            <ul className="space-y-2">
                                                {Object.entries(objectData).map(([k, v]) => (
                                                    <li key={k} className="flex gap-3 text-sm">
                                                        <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold mt-0.5">{k}</span>
                                                        <span className="text-muted-foreground leading-relaxed">{v}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </SectionCard>
                                    )}

                                    {/* Financials & KPI */}
                                    {Object.keys(financialData).length > 0 && (
                                        <SectionCard title="Company Financials" icon={TrendingUp}>
                                            <div className="space-y-0.5">
                                                {Object.entries(financialData).map(([k, v]) => <DetailRow key={k} label={k} value={v} />)}
                                            </div>
                                        </SectionCard>
                                    )}

                                    {/* Raw KPI */}
                                    {raw_html?.kpi && (
                                        <SectionCard title="Key Performance Indicators (KPI)" icon={TrendingUp}>
                                            <RawHtmlRenderer html={raw_html.kpi} />
                                        </SectionCard>
                                    )}

                                    {/* Reservation */}
                                    {Object.keys(reservationData).length > 0 && (
                                        <SectionCard title="IPO Reservation" icon={Users}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                                                {Object.entries(reservationData).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between py-2 border-b border-border/50">
                                                        <span className="text-sm text-muted-foreground capitalize truncate pr-4" title={k}>{k}</span>
                                                        <span className="text-sm font-medium">{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </SectionCard>
                                    )}

                                    {/* Anchor & Promoter */}
                                    {raw_html?.anchor_investors && <SectionCard title="Anchor Investor Details" icon={Users}><EnhancedHtmlRenderer html={raw_html.anchor_investors} /></SectionCard>}
                                    {raw_html?.promoter_group && <SectionCard title="Promoter Group" icon={Users}><EnhancedHtmlRenderer html={raw_html.promoter_group} /></SectionCard>}
                                </div>
                            )}

                            {/* --- GROWW CONTENT --- */}
                            {activeTab === 'Groww' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {(values.strengths?.length > 0 || values.risks?.length > 0) ? (
                                        <div className="grid grid-cols-1 gap-6">
                                            {values.strengths?.length > 0 && (
                                                <SectionCard title="Strengths" icon={TrendingUp} className="border-l-4 border-l-green-500/50">
                                                    <ul className="space-y-3">
                                                        {values.strengths.map((s: string, i: number) => (
                                                            <li key={i} className="flex gap-3 text-sm text-foreground bg-muted/20 p-3 rounded-lg border border-border/50">
                                                                <span className="text-green-500 font-bold text-lg leading-none">•</span>
                                                                <span className="opacity-90 leading-relaxed">{s}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </SectionCard>
                                            )}
                                            {values.risks?.length > 0 && (
                                                <SectionCard title="Risks" icon={AlertTriangle} className="border-l-4 border-l-red-500/50">
                                                    <ul className="space-y-3">
                                                        {values.risks.map((r: string, i: number) => (
                                                            <li key={i} className="flex gap-3 text-sm text-foreground bg-muted/20 p-3 rounded-lg border border-border/50">
                                                                <span className="text-red-500 font-bold text-lg leading-none">•</span>
                                                                <span className="opacity-90 leading-relaxed">{r}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </SectionCard>
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState source="Groww" />
                                    )}
                                </div>
                            )}

                            {/* --- SP TULSIAN CONTENT --- */}
                            {activeTab === 'Sptulsian' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {values['expert_description'] && (
                                        <SectionCard title="Description" icon={Info} className="border-l-4 border-l-blue-500/50">
                                            <p className="text-foreground text-sm leading-relaxed">{values['expert_description']}</p>
                                        </SectionCard>
                                    )}

                                    {(raw_html?.expert_analysis_clean || values['expert_summary']) ? (
                                        <SectionCard title="Expert Analysis" icon={FileText}>
                                            {raw_html?.expert_analysis_clean ? (
                                                <EnhancedHtmlRenderer html={raw_html.expert_analysis_clean} />
                                            ) : (
                                                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
                                                    {values['expert_summary']}
                                                </div>
                                            )}
                                        </SectionCard>
                                    ) : (
                                        <EmptyState source="SP Tulsian" />
                                    )}
                                </div>
                            )}

                            {/* --- GMP CONTENT --- */}
                            {activeTab === 'GMP' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {(values['gmp'] || values['subscription']) ? (
                                        <SectionCard title="Grey Market Premium & Subscription" icon={BarChart3} className="border-l-4 border-l-orange-500/50">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 text-center">
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Current GMP</div>
                                                    <div className="text-3xl font-bold text-green-600 tracking-tight">₹{values['gmp']?.toString().replace(/[₹\s]/g, '') || 'N/A'}</div>
                                                    <div className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                                                        <span>Updated: {values['gmp_updated'] || 'Recently'}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 text-center">
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Overall Subscription</div>
                                                    <div className="text-3xl font-bold text-blue-600 tracking-tight">{values['subscription'] || 'N/A'}</div>
                                                    <div className="text-xs text-muted-foreground mt-2">Times subscribed</div>
                                                </div>
                                            </div>

                                            {values['estimated_listing_price'] && (
                                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-6 flex items-center justify-between">
                                                    <span className="text-sm font-medium">Estimated Listing Price</span>
                                                    <span className="text-lg font-bold text-primary">{values['estimated_listing_price']}</span>
                                                </div>
                                            )}

                                            {values['gmp_trend'] && Array.isArray(values['gmp_trend']) && values['gmp_trend'].length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4" /> GMP Trend History
                                                    </h4>
                                                    <div className="overflow-hidden rounded-xl border border-border">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-muted/50">
                                                                <tr>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground">GMP</th>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground">Sub</th>
                                                                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Est. Listing</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/50 bg-card">
                                                                {values['gmp_trend'].map((row: any, i: number) => (
                                                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                                        <td className="px-4 py-3 font-medium">{row.gmp_date}</td>
                                                                        <td className={`px-4 py-3 font-semibold ${row.gmp !== '--' ? 'text-green-600' : 'text-muted-foreground'}`}>{row.gmp}</td>
                                                                        <td className="px-4 py-3">{row.subscription}</td>
                                                                        <td className="px-4 py-3 text-right">{row.estimated_listing_price}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </SectionCard>
                                    ) : (
                                        <EmptyState source="InvestorGain" />
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </main>
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLoginSuccess} />
        </div>
    );
}

// Sub-components
const DetailRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors px-2 -mx-2 rounded">
        <span className="text-sm text-muted-foreground capitalize leading-tight pt-0.5">{label.replace(/\b\w/g, l => l.toUpperCase())}</span>
        <span className="text-sm font-semibold text-foreground text-right pl-4 max-w-[60%] leading-tight">{value}</span>
    </div>
);

const SectionCard = ({ title, icon: Icon, children, className = "" }: any) => (
    <div className={`bg-card rounded-xl border border-border overflow-hidden shadow-sm ${className}`}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 bg-muted/10">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">{title}</h3>
        </div>
        <div className="p-5">
            {children}
        </div>
    </div>
);

const RawHtmlRenderer = ({ html }: { html: string }) => (
    <div
        dangerouslySetInnerHTML={{
            __html: (() => {
                try {
                    if (typeof window === 'undefined') return html;
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const tables = doc.querySelectorAll('table');
                    let cleanHtml = '';
                    tables.forEach(table => {
                        table.className = 'w-full text-sm border-collapse mb-6 last:mb-0 border border-border rounded-lg overflow-hidden';
                        table.querySelectorAll('th').forEach(th => {
                            th.className = 'px-4 py-2.5 bg-muted/50 text-left border-b border-border font-semibold text-foreground tracking-tight text-xs uppercase';
                        });
                        table.querySelectorAll('td').forEach(td => {
                            td.className = 'px-4 py-2.5 border-b border-border/50 text-foreground';
                        });
                        cleanHtml += table.outerHTML;
                    });
                    return cleanHtml || html;
                } catch (e) {
                    return html;
                }
            })()
        }}
    />
);

const EnhancedHtmlRenderer = ({ html }: { html: string }) => (
    <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{
            __html: (() => {
                try {
                    if (typeof window === 'undefined') return html;
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    // Style Tables
                    const tables = doc.querySelectorAll('table');
                    tables.forEach(table => {
                        table.className = 'w-full text-sm border-collapse mb-6 last:mb-0 border border-border rounded-lg overflow-hidden';
                        table.querySelectorAll('th').forEach(th => {
                            th.className = 'px-4 py-2.5 bg-muted/50 text-left border-b border-border font-semibold text-foreground tracking-tight text-xs uppercase';
                        });
                        table.querySelectorAll('td').forEach(td => {
                            td.className = 'px-4 py-2.5 border-b border-border/50 text-foreground';
                        });
                    });

                    // Style Links & Filter Non-PDF
                    const links = doc.querySelectorAll('a');
                    links.forEach(link => {
                        const isPdf = link.href.toLowerCase().includes('.pdf') || link.textContent?.toLowerCase().includes('pdf');

                        if (isPdf) {
                            link.className = 'text-primary hover:underline font-medium inline-flex items-center gap-1';
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                        } else {
                            // Unwrap non-PDF links (keep text, remove link)
                            const text = doc.createTextNode(link.textContent || '');
                            link.parentNode?.replaceChild(text, link);
                        }
                    });

                    return doc.body.innerHTML || html;
                } catch (e) {
                    return html;
                }
            })()
        }}
    />
);

const EmptyState = ({ source }: { source: string }) => (
    <div className="text-center py-12 rounded-xl border-2 border-dashed border-border/60 bg-muted/10">
        <Info className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">No data available from {source}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">This source may not have provided details for this IPO yet.</p>
    </div>
);

const LoadingState = () => (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Loading IPO Details...</p>
    </div>
);

const ErrorState = ({ error, navigate }: { error: string | null, navigate: any }) => (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Unavailable</h2>
        <p className="text-muted-foreground mb-6">{error || 'IPO not found'}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">
            Return to Dashboard
        </button>
    </div>
);
