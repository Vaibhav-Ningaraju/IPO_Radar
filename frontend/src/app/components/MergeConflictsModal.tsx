import { useEffect, useState } from 'react';
import { X, GitMerge, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { buildApiUrl, fetchWithTimeout, API_CONFIG } from '../config/api';

interface MergeCandidate {
    master: any;
    candidate: any;
    score: string;
}

interface MergeConflictsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MergeConflictsModal({ isOpen, onClose }: MergeConflictsModalProps) {
    const [candidates, setCandidates] = useState<MergeCandidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [mergingId, setMergingId] = useState<string | null>(null);

    const fetchDuplicates = async () => {
        setLoading(true);
        try {
            const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.ADMIN_SCAN_DUPLICATES));
            const data = await res.json();
            if (Array.isArray(data)) {
                setCandidates(data);
            }
        } catch (err) {
            console.error("Failed to scan duplicates", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchDuplicates();
        }
    }, [isOpen]);

    const handleMerge = async (masterId: string, candidateId: string) => {
        setMergingId(candidateId);
        try {
            const res = await fetchWithTimeout(
                buildApiUrl(API_CONFIG.ENDPOINTS.ADMIN_MERGE),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ masterId, candidateId })
                }
            );

            if (res.ok) {
                // Remove from list
                setCandidates(prev => prev.filter(c => c.candidate._id !== candidateId));
            } else {
                alert("Merge failed");
            }
        } catch (err) {
            console.error("Merge error", err);
            alert("Merge error");
        } finally {
            setMergingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-4xl h-[80vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <GitMerge className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Resolve Data Conflicts</h2>
                            <p className="text-xs text-muted-foreground">Found {candidates.length} potential duplicates</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchDuplicates}
                            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-muted/10 p-6 space-y-4">
                    {loading && candidates.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">Scanning database...</div>
                    ) : candidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Check className="w-12 h-12 text-green-500 mb-4" />
                            <p>No conflicts found. Data is clean!</p>
                        </div>
                    ) : (
                        candidates.map((item, idx) => (
                            <div key={idx} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">

                                {/* Master (Keep) */}
                                <div className="flex-1 p-3 rounded-lg border border-green-500/20 bg-green-500/5 w-full">
                                    <div className="text-[10px] uppercase font-bold text-green-600 mb-1">Keep (Primary)</div>
                                    <div className="font-semibold text-foreground">{item.master.ipo_name}</div>
                                    <div className="text-xs text-muted-foreground mt-1 truncate">{item.master.url}</div>
                                    <div className="mt-2 flex gap-2">
                                        {item.master.status && <span className="text-[10px] px-2 py-0.5 rounded bg-background border border-border">{item.master.status}</span>}
                                        {item.master.groww_url && <span className="text-[10px] px-2 py-0.5 rounded bg-background border border-border">Has Groww</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="text-xs font-bold text-orange-500">{Math.round(parseFloat(item.score) * 100)}% Match</div>
                                    <GitMerge className="w-4 h-4 text-muted-foreground rotate-90 md:rotate-0" />
                                </div>

                                {/* Candidate (Merge & Delete) */}
                                <div className="flex-1 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 w-full">
                                    <div className="text-[10px] uppercase font-bold text-orange-600 mb-1">Merge & Delete</div>
                                    <div className="font-semibold text-foreground">{item.candidate.ipo_name}</div>
                                    <div className="text-xs text-muted-foreground mt-1 truncate">{item.candidate.url}</div>
                                    <div className="mt-2 flex gap-2">
                                        {item.candidate.status && <span className="text-[10px] px-2 py-0.5 rounded bg-background border border-border">{item.candidate.status}</span>}
                                        {item.candidate.groww_url && <span className="text-[10px] px-2 py-0.5 rounded bg-background border border-border">Has Groww</span>}
                                    </div>
                                </div>

                                {/* Action */}
                                <button
                                    onClick={() => handleMerge(item.master._id, item.candidate._id)}
                                    disabled={mergingId === item.candidate._id}
                                    className="px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-sm font-medium shrink-0 disabled:opacity-50"
                                >
                                    {mergingId === item.candidate._id ? 'Merging...' : 'Confirm Merge'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
