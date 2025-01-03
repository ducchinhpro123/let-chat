class DateTimeFormatter {
    static formatDateTime(dateString: string) {
        const date = new Date(dateString);
        // If invalid date, return empty string
        if (isNaN(date)) {
            return '';
        }

        const now = new Date();
        const diff = now - date;


        // Less than 1 minute ago
        if (diff < 60 * 1000) {
            return 'Just now';
        }

        // Less than 1 hour ago
        if (diff < 60 * 60 * 1000) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes}m ago`;
        }

        // Less than 24 hours ago
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            return `${hours}h ago`;
        }

        // Less than 7 days ago
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            if (days === 1) return 'Yesterday';
            return `${days}d ago`;
        }

        // Format date based on year
        const currentYear = now.getFullYear();
        const messageYear = date.getFullYear();

        // If same year, show date and month
        if (currentYear === messageYear) {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // If different year, include the year
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatUserTime(dateString) {
        const date = new Date(dateString);

        // Return time in user's local timezone
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true // Use 12-hour format
        });
    }

    static getUserTimeZone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
}

export default DateTimeFormatter;
