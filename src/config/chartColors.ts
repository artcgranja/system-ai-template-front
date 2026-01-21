/**
 * Astro Steel Blue Complementary Color Palette
 * 
 * Based on 2026 design system best practices:
 * - Blue + Orange/Persimmon complementary pairing
 * - 8-color categorical palette for data visualization
 * - Accessible and harmonious across light/dark themes
 * - CVD (Color Vision Deficiency) friendly
 */

export const ASTRO_CHART_COLORS = {
  // Primary Astro Steel Blue scale
  primary: '#4F739E',      // astro-500 - Main brand color
  primaryLight: '#6b8bb5', // astro-400 - Lighter variant
  primaryLighter: '#8daec9', // astro-300 - Even lighter
  
  // Complementary colors (Orange/Persimmon - opposite of blue on color wheel)
  complementary: '#E67E22',      // Warm orange - high contrast complement
  complementaryLight: '#F39C12', // Golden orange - lighter variant
  complementaryLighter: '#F7DC6F', // Soft amber - lightest variant
  
  // Supporting colors for multi-series charts
  purple: '#6e4df9',      // Purple - maintains brand consistency
  teal: '#16A085',        // Teal - harmonious with blue
  coral: '#E74C3C',       // Coral red - warm accent
  emerald: '#27AE60',     // Emerald green - success/positive
  
  // Extended palette for 8+ series
  navy: '#2C3E50',        // Dark navy - depth
  sky: '#3498DB',         // Sky blue - bright accent
  gold: '#F1C40F',        // Gold - highlight
  rose: '#E91E63',        // Rose - vibrant accent
};

/**
 * Main chart color palette (8 colors for categorical data)
 * Ordered by visual importance and harmony
 */
export const CHART_PALETTE = [
  ASTRO_CHART_COLORS.primary,           // 1. Astro Steel Blue (main)
  ASTRO_CHART_COLORS.complementary,     // 2. Orange (complement)
  ASTRO_CHART_COLORS.teal,              // 3. Teal (harmonious)
  ASTRO_CHART_COLORS.purple,            // 4. Purple (brand)
  ASTRO_CHART_COLORS.emerald,           // 5. Emerald (positive)
  ASTRO_CHART_COLORS.coral,             // 6. Coral (warm accent)
  ASTRO_CHART_COLORS.sky,               // 7. Sky blue (bright)
  ASTRO_CHART_COLORS.gold,              // 8. Gold (highlight)
];

/**
 * Sequential palette for single-hue charts (Astro Steel Blue scale)
 */
export const SEQUENTIAL_PALETTE = [
  ASTRO_CHART_COLORS.primaryLighter,    // Lightest
  ASTRO_CHART_COLORS.primaryLight,      // Light
  ASTRO_CHART_COLORS.primary,           // Base
  '#3d5a7a',                            // astro-600 - Darker
  '#2e4560',                            // astro-700 - Darkest
];

/**
 * Diverging palette (Blue to Orange with neutral midpoint)
 */
export const DIVERGING_PALETTE = {
  low: ASTRO_CHART_COLORS.primary,           // Blue (low values)
  mid: '#94A3B8',                            // Neutral gray (midpoint)
  high: ASTRO_CHART_COLORS.complementary,    // Orange (high values)
};

/**
 * Quota bar colors - harmonious with Astro theme
 */
export const QUOTA_COLORS = {
  low: ASTRO_CHART_COLORS.emerald,          // Green (0-50%) - healthy
  medium: ASTRO_CHART_COLORS.complementaryLight, // Golden orange (50-80%) - warning
  high: ASTRO_CHART_COLORS.coral,            // Coral red (80-100%) - critical
};
