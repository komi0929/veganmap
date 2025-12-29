// Japan Standard Time (JST) utilities
// All reservation times should be handled in JST (UTC+9)

const JST_OFFSET_HOURS = 9;

/**
 * Get current time in JST
 */
export function getJSTNow(): Date {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * JST_OFFSET_HOURS));
}

/**
 * Convert any date to JST
 */
export function toJST(date: Date): Date {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * JST_OFFSET_HOURS));
}

/**
 * Format a date in JST with explicit timezone label
 * Example output: "2024年12月29日 19:00 (Japan Time)"
 */
export function formatJSTDateTime(date: Date, locale: string = 'ja'): string {
    const jstDate = toJST(date);

    const dateStr = jstDate.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        year: 'numeric',
        month: locale === 'ja' ? 'long' : 'short',
        day: 'numeric'
    });

    const timeStr = jstDate.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const tzLabel = locale === 'ja' ? '日本時間' : 'Japan Time';

    return `${dateStr} ${timeStr} (${tzLabel})`;
}

/**
 * Format just the time in JST with timezone label
 * Example output: "19:00 (Japan Time)"
 */
export function formatJSTTime(date: Date, locale: string = 'ja'): string {
    const jstDate = toJST(date);

    const timeStr = jstDate.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const tzLabel = locale === 'ja' ? '日本時間' : 'Japan Time';

    return `${timeStr} (${tzLabel})`;
}

/**
 * Parse a date string that should be interpreted as JST
 */
export function parseAsJST(dateStr: string): Date {
    // If the string doesn't include timezone info, assume it's JST
    if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        return new Date(dateStr + '+09:00');
    }
    return new Date(dateStr);
}

/**
 * Get ISO string in JST format (for Supabase storage)
 * Includes the +09:00 offset
 */
export function toJSTISOString(date: Date): string {
    const jstDate = toJST(date);
    const year = jstDate.getFullYear();
    const month = String(jstDate.getMonth() + 1).padStart(2, '0');
    const day = String(jstDate.getDate()).padStart(2, '0');
    const hours = String(jstDate.getHours()).padStart(2, '0');
    const minutes = String(jstDate.getMinutes()).padStart(2, '0');
    const seconds = String(jstDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}

/**
 * Generate time slots for reservation (in JST)
 * Returns array of formatted time strings like "11:00 (Japan Time)"
 */
export function generateTimeSlots(
    startHour: number = 11,
    endHour: number = 21,
    intervalMinutes: number = 30,
    locale: string = 'ja'
): { value: string; label: string }[] {
    const slots: { value: string; label: string }[] = [];
    const tzLabel = locale === 'ja' ? '日本時間' : 'Japan Time';

    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
            if (hour === endHour && minute > 0) break;

            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            slots.push({
                value: timeStr,
                label: `${timeStr} (${tzLabel})`
            });
        }
    }

    return slots;
}
