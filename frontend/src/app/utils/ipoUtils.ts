export interface ScraperData {
    url: string;
    groww_url?: string;
    ipo_name: string;
    status: string;
    raw_html?: any;
    values: {
        "ipo date"?: string;
        "listed on"?: string;
        "face value"?: string;
        "price band"?: string;
        "issue price"?: string;
        "lot size"?: string;
        "sale type"?: string;
        "issue type"?: string;
        "listing at"?: string;
        "qib shares offered"?: string;
        "retail shares offered"?: string;
        "total shares offered"?: string;
        // Add other dynamic keys as needed
        [key: string]: any;
    }
}

// Normalizes IPO name for matching and URL generation
export const normalizeName = (name: string) => {
    return name.toLowerCase()
        .replace(/\s*&\s*/g, ' and ') // Convert & to "and"
        .replace(/limited|ltd|pvt|private|drhp|rhp|ipo|india|technologies|systems|solutions|industries|holdings|services|finance|enterprises/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s-]+/g, '-');
};

export const mergeIPOs = (data: ScraperData[]): ScraperData[] => {
    const merged = new Map<string, ScraperData>();

    data.forEach(item => {
        const key = normalizeName(item.ipo_name);

        if (!merged.has(key)) {
            merged.set(key, { ...item }); // Clone
        } else {
            const existing = merged.get(key)!;

            // Merge Values (Prefer New/Existing over Old/Item)
            existing.values = { ...item.values, ...existing.values };

            // Merge Raw HTML
            if (item.raw_html) {
                existing.raw_html = { ...item.raw_html, ...(existing.raw_html || {}) };
            }

            // Pick best status (Open > Upcoming > Closed)
            if (item.status === 'open') existing.status = 'open';
            else if (item.status === 'upcoming' && existing.status === 'closed') existing.status = 'upcoming';

            // Pick best URL (prefer one with more info?? or just keep first)
            if (!existing.url && item.url) existing.url = item.url;
            if (!existing.groww_url && item.groww_url) existing.groww_url = item.groww_url;

            // Keep best name (longest?)
            if (item.ipo_name.length > existing.ipo_name.length) existing.ipo_name = item.ipo_name;
        }
    });

    return Array.from(merged.values());
};

export const mapScraperDataToUI = (data: ScraperData[]) => {
    return data.map(item => {
        const values = item.values || {};

        // Parse dates
        // Example format: "9 to 13 Jan, 2026" or "13 Jan, 2026"
        let openDate = 'TBA';
        let closeDate = 'TBA';

        const rawDate = values['ipo date'];
        if (rawDate) {
            if (rawDate.includes(' to ')) {
                const parts = rawDate.split(' to ');
                // parts[0] might be "9", parts[1] might be "13 Jan, 2026"
                // We want openDate to be "9 Jan, 2026" ideally, but purely extraction-wise:
                // Let's keep it simple for now or try to extract Month/Year from the second part

                const endDatePart = parts[1].trim();
                const endParts = endDatePart.split(' '); // ["13", "Jan,", "2026"]

                if (endParts.length >= 3) {
                    const monthYear = endParts.slice(1).join(' '); // "Jan, 2026"
                    openDate = `${parts[0]} ${monthYear}`;
                    closeDate = endDatePart;
                } else {
                    openDate = parts[0];
                    closeDate = parts[1];
                }
            } else {
                openDate = rawDate;
                closeDate = rawDate;
            }
        }

        // DB has 'listing date'
        const listingDate = values['listing date'] || values['listed on'] || 'TBA';

        // Parse Subscription if available
        // Chittorgarh often puts subscription in a separate table, but sometimes in values as 'Overall Subscription'
        const subscription = values['overall subscription'] || values['subscription'] || 'TBA';

        // Parse GMP
        // InvestorGain saves it as 'gmp' or 'gmp(₹)' usually with '₹' symbol
        const gmpRaw = values['gmp'] || values['gmp(₹)'] || '0';
        const gmpValue = parseFloat(gmpRaw.replace(/[^\d.-]/g, '')) || 0;

        // Parse Issue Price (Upper Band) for % calc
        // "₹100 to ₹120" -> 120
        let issuePrice = 0;
        const priceBand = values['price band'] || values['issue price'] || '';
        if (priceBand) {
            const prices = priceBand.match(/[\d,.]+/g);
            if (prices && prices.length > 0) {
                // Take the last number as the upper band
                issuePrice = parseFloat(prices[prices.length - 1].replace(/,/g, ''));
            }
        }

        const gmp = gmpValue;
        const gmpPercent = (issuePrice > 0) ? (gmp / issuePrice) * 100 : 0;

        return {
            name: item.ipo_name || 'Unknown IPO',
            sector: 'General', // Not in scraper data
            priceRange: values['price band'] || 'TBA',
            lotSize: parseInt(values['lot size']?.split(' ')[0] || '0'),
            gmp: gmp,
            gmpPercent: gmpPercent,
            subscription: subscription,
            openDate: openDate,
            closeDate: closeDate,
            status: (item.status === 'open' ? 'open' : item.status === 'upcoming' ? 'upcoming' : 'closed') as 'open' | 'upcoming' | 'closed',
            listingDate: listingDate,
            values: values,
            url: item.url,
            groww_url: item.groww_url,
            raw_html: item.raw_html,
            logo: values['logo_url']
        };
    }).filter(item => item.openDate !== 'TBA' || item.status === 'upcoming' || item.status === 'open');
};
