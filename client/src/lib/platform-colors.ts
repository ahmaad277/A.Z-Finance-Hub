/**
 * Platform Color System
 * Centralized color definitions for each platform across the application
 * 
 * نظام ألوان المنصات
 * تعريفات مركزية لألوان كل منصة عبر التطبيق
 */

interface PlatformColorConfig {
  // Badge styling (for platform badges)
  badgeLight: string;
  badgeDark: string;
  // Border styling (for investment cards)
  borderLeft: string;
  // Chart color (for analytics visualizations)
  chartColor: string;
}

type PlatformColors = Record<string, PlatformColorConfig>;

/**
 * Platform color definitions
 * Colors are defined for both light and dark modes
 */
const PLATFORM_COLORS: PlatformColors = {
  // صكوك - White/Light Gray
  'sukuk': {
    badgeLight: 'bg-gray-100 text-gray-900 border-gray-300',
    badgeDark: 'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600',
    borderLeft: 'border-l-gray-300 dark:border-l-gray-600',
    chartColor: '#9CA3AF', // gray-400
  },
  // منافع - Black/Dark
  'manfaa': {
    badgeLight: 'bg-gray-900 text-white border-gray-800',
    badgeDark: 'dark:bg-gray-200 dark:text-gray-900 dark:border-gray-300',
    borderLeft: 'border-l-gray-900 dark:border-l-gray-200',
    chartColor: '#1F2937', // gray-800
  },
  'manfa\'a': { // Alternative spelling
    badgeLight: 'bg-gray-900 text-white border-gray-800',
    badgeDark: 'dark:bg-gray-200 dark:text-gray-900 dark:border-gray-300',
    borderLeft: 'border-l-gray-900 dark:border-l-gray-200',
    chartColor: '#1F2937',
  },
  // صفقة - Yellow
  'safqa': {
    badgeLight: 'bg-yellow-400 text-gray-900 border-yellow-500',
    badgeDark: 'dark:bg-yellow-500 dark:text-gray-900 dark:border-yellow-600',
    borderLeft: 'border-l-yellow-400 dark:border-l-yellow-500',
    chartColor: '#FACC15', // yellow-400
  },
  // ترميز - Green
  'tarmeem': {
    badgeLight: 'bg-green-500 text-white border-green-600',
    badgeDark: 'dark:bg-green-600 dark:text-white dark:border-green-700',
    borderLeft: 'border-l-green-500 dark:border-l-green-600',
    chartColor: '#22C55E', // green-500
  },
  // دينار - Sky Blue
  'dinar': {
    badgeLight: 'bg-sky-400 text-white border-sky-500',
    badgeDark: 'dark:bg-sky-500 dark:text-white dark:border-sky-600',
    borderLeft: 'border-l-sky-400 dark:border-l-sky-500',
    chartColor: '#38BDF8', // sky-400
  },
  // تعميد - Blue
  'tameed': {
    badgeLight: 'bg-blue-600 text-white border-blue-700',
    badgeDark: 'dark:bg-blue-700 dark:text-white dark:border-blue-800',
    borderLeft: 'border-l-blue-600 dark:border-l-blue-700',
    chartColor: '#2563EB', // blue-600
  },
  'ta\'meed': { // Alternative spelling
    badgeLight: 'bg-blue-600 text-white border-blue-700',
    badgeDark: 'dark:bg-blue-700 dark:text-white dark:border-blue-800',
    borderLeft: 'border-l-blue-600 dark:border-l-blue-700',
    chartColor: '#2563EB',
  },
};

/**
 * Default color scheme for unknown platforms
 */
const DEFAULT_COLORS: PlatformColorConfig = {
  badgeLight: 'bg-primary/10 text-primary border-primary/20',
  badgeDark: 'dark:bg-primary/20 dark:text-primary dark:border-primary/30',
  borderLeft: 'border-l-primary',
  chartColor: 'hsl(var(--primary))',
};

/**
 * Normalize platform name to lowercase and remove special characters
 */
function normalizePlatformName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/'/g, '') // Remove apostrophes
    .replace(/\s+/g, '_'); // Replace spaces with underscores
}

/**
 * Get platform color configuration by platform name
 * Returns default colors if platform is not found
 */
export function getPlatformColors(platformName?: string | null): PlatformColorConfig {
  if (!platformName) return DEFAULT_COLORS;
  
  const normalized = normalizePlatformName(platformName);
  
  // Try exact match first
  if (PLATFORM_COLORS[normalized]) {
    return PLATFORM_COLORS[normalized];
  }
  
  // Try partial match (e.g., "Dinar Plus" matches "dinar")
  const matchedKey = Object.keys(PLATFORM_COLORS).find(key => 
    normalized.includes(key) || key.includes(normalized)
  );
  
  return matchedKey ? PLATFORM_COLORS[matchedKey] : DEFAULT_COLORS;
}

/**
 * Get combined badge classes for a platform
 */
export function getPlatformBadgeClasses(platformName?: string | null): string {
  const colors = getPlatformColors(platformName);
  return `${colors.badgeLight} ${colors.badgeDark}`;
}

/**
 * Get border-left classes for a platform
 */
export function getPlatformBorderClasses(platformName?: string | null): string {
  const colors = getPlatformColors(platformName);
  return colors.borderLeft;
}

/**
 * Get chart color (hex) for a platform
 */
export function getPlatformChartColor(platformName?: string | null): string {
  const colors = getPlatformColors(platformName);
  return colors.chartColor;
}

/**
 * Export the full color map for debugging/reference
 */
export { PLATFORM_COLORS };
