// ============================================
// FRONTEND FIXES
// File: frontend/src/app/utils/dateUtils.ts (NEW FILE)
// ============================================

/**
 * Parse IPO date string to Date object
 * Handles various date formats and 'TBA' values
 */
export const parseIPODate = (dateStr: string | undefined): Date | null => {
    if (!dateStr || dateStr === 'TBA') return null;

    // Remove trailing 'T' and trim
    const cleaned = dateStr.replace(/ T$/, '').trim();

    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Format date for display
 */
export const formatIPODate = (date: Date | null): string => {
    if (!date) return 'TBA';

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * Check if date is in the past
 */
export const isDatePast = (date: Date | null): boolean => {
    if (!date) return false;
    return date <= new Date();
};

/**
 * Get days until date
 */
export const getDaysUntil = (date: Date | null): number | null => {
    if (!date) return null;

    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
