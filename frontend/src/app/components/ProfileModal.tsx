import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { buildApiUrl, fetchWithTimeout, API_CONFIG } from '../config/api';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialProfile: UserProfile | null;
    onSave: (profile: UserProfile) => void;
}

interface UserProfile {
    name: string;
    email: string;
    notifications: boolean;
}

export function ProfileModal({ isOpen, onClose, initialProfile, onSave }: ProfileModalProps) {
    const [profile, setProfile] = useState<UserProfile>({
        name: '',
        email: '',
        notifications: false
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Update local state when initialProfile changes or modal opens
    useEffect(() => {
        if (initialProfile) {
            setProfile(initialProfile);
        }
    }, [initialProfile, isOpen]);

    const handleSave = () => {
        setSaving(true);
        fetchWithTimeout(
            buildApiUrl(API_CONFIG.ENDPOINTS.PROFILE),
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profile)
            }
        )
            .then(res => res.json())
            .then(() => {
                setSaving(false);
                onSave(profile);
                onClose();
            })
            .catch(err => {
                console.error('Error saving profile:', err);
                setError('Failed to save profile');
                setSaving(false);
            });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                    <h2 className="text-lg font-semibold text-foreground">User Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* content */}
                <div className="p-6 space-y-4">
                    {error && <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{error}</div>}

                    {false ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Full Name</label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Email Address</label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
}
