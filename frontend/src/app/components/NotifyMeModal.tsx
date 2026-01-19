import { useState, useEffect } from 'react';
import { X, Save, Loader2, Bell } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Input } from './ui/input';
import { buildApiUrl, fetchWithTimeout, API_CONFIG } from '../config/api';

interface NotifyMeModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
}

export function NotifyMeModal({ isOpen, onClose, userEmail = '' }: NotifyMeModalProps) {
    const [preferences, setPreferences] = useState({
        newIPOs: true,
        closingSoon: true,
        allotmentOut: false,
        listingDate: false,
    });
    const [email, setEmail] = useState('');
    const [frequency, setFrequency] = useState('1day');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailEnabled, setEmailEnabled] = useState(false);

    // Load existing preferences when modal opens
    useEffect(() => {
        if (isOpen && userEmail) {
            setLoading(true);
            fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.PROFILE}?email=${encodeURIComponent(userEmail)}`))
                .then(res => res.json())
                .then(data => {
                    if (data.preferences) {
                        setPreferences({
                            newIPOs: data.preferences.newIPOs ?? true,
                            closingSoon: data.preferences.closingSoon ?? true,
                            allotmentOut: data.preferences.allotmentOut ?? false,
                            listingDate: data.preferences.listingDate ?? false,
                        });
                        setEmail(data.preferences.notificationEmail || userEmail);
                        setFrequency(data.preferences.frequency || '1day');
                        setEmailEnabled(data.preferences.emailEnabled ?? false);
                    }
                })
                .catch(err => console.error('Failed to load preferences:', err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, userEmail]);

    const handleSameAsLogin = () => {
        if (userEmail) {
            setEmail(userEmail);
        }
    };

    const handleSave = async () => {
        if (!userEmail) return; // Must be logged in
        setSaving(true);

        try {
            const payload = {
                email: userEmail,
                preferences: {
                    ...preferences,
                    notificationEmail: email || userEmail,
                    frequency,
                    emailEnabled
                }
            };

            const res = await fetchWithTimeout(
                buildApiUrl(API_CONFIG.ENDPOINTS.PROFILE),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );

            if (res.ok) {
                // Determine if we should trigger an immediate email? 
                // For now, just save.
                onClose();
            } else {
                console.error("Failed to save preferences");
            }
        } catch (error) {
            console.error("Error saving preferences:", error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Notify Me Settings</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Master Email Toggle */}
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="emailEnabled"
                                checked={emailEnabled}
                                onCheckedChange={(checked) => setEmailEnabled(!!checked)}
                            />
                            <label htmlFor="emailEnabled" className="text-sm font-medium cursor-pointer select-none">
                                Enable email notifications for IPOs
                            </label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 ml-7">
                            Turn this on to receive email updates based on your preferences below
                        </p>
                    </div>

                    {/* Notification Types */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground block">
                            I want to be notified about:
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="newIPOs"
                                    checked={preferences.newIPOs}
                                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, newIPOs: !!checked }))}
                                />
                                <label htmlFor="newIPOs" className="text-sm cursor-pointer select-none">New IPOs Open</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="closingSoon"
                                    checked={preferences.closingSoon}
                                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, closingSoon: !!checked }))}
                                />
                                <label htmlFor="closingSoon" className="text-sm cursor-pointer select-none">Closing Soon</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="allotmentOut"
                                    checked={preferences.allotmentOut}
                                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, allotmentOut: !!checked }))}
                                />
                                <label htmlFor="allotmentOut" className="text-sm cursor-pointer select-none">Allotment Out</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="listingDate"
                                    checked={preferences.listingDate}
                                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, listingDate: !!checked }))}
                                />
                                <label htmlFor="listingDate" className="text-sm cursor-pointer select-none">Listing Date</label>
                            </div>
                        </div>
                    </div>

                    {/* Email Settings */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground block">
                            Notification Email
                        </label>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="Enter email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1"
                            />
                            <button
                                onClick={handleSameAsLogin}
                                className="px-3 py-2 text-xs font-medium bg-muted text-foreground hover:bg-muted/80 rounded-md whitespace-nowrap transition-colors border border-border"
                            >
                                Same as Login
                            </button>
                        </div>
                    </div>

                    {/* Frequency */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground block">
                            Frequency of Updates
                        </label>
                        <Select value={frequency} onValueChange={setFrequency}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1day">Every 1 Day</SelectItem>
                                <SelectItem value="2days">Every 2 Days</SelectItem>
                                <SelectItem value="3days">Every 3 Days</SelectItem>
                                <SelectItem value="4days">Every 4 Days</SelectItem>
                                <SelectItem value="5days">Every 5 Days</SelectItem>
                                <SelectItem value="6days">Every 6 Days</SelectItem>
                                <SelectItem value="7days">Every 7 Days</SelectItem>
                                <SelectItem value="1week">Every 1 Week</SelectItem>
                                <SelectItem value="2weeks">Every 2 Weeks</SelectItem>
                                <SelectItem value="3weeks">Every 3 Weeks</SelectItem>
                                <SelectItem value="4weeks">Every 4 Weeks</SelectItem>
                                <SelectItem value="5weeks">Every 5 Weeks</SelectItem>
                                <SelectItem value="1month">Every 1 Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

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
                        Save Preferences
                    </button>
                </div>

            </div>
        </div>
    );
}
