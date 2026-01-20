/**
 * Centralized logging utility for the application.
 *
 * Features:
 * - Development-only debug/info logs
 * - Production-safe warn/error logs
 * - Structured log format with prefixes
 * - Ready for future integration with monitoring services (Sentry, LogRocket)
 */

const isDev = process.env.NODE_ENV === 'development';

interface LogContext {
  component?: string;
  action?: string;
  [key: string]: unknown;
}

function formatMessage(message: string, context?: LogContext): string {
  if (!context) return message;

  const prefix = context.component
    ? `[${context.component}${context.action ? `:${context.action}` : ''}]`
    : '';

  return prefix ? `${prefix} ${message}` : message;
}

export const logger = {
  /**
   * Debug logs - only shown in development
   */
  debug: (message: string, context?: LogContext, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[DEBUG] ${formatMessage(message, context)}`, ...args);
    }
  },

  /**
   * Info logs - only shown in development
   */
  info: (message: string, context?: LogContext, ...args: unknown[]) => {
    if (isDev) {
      console.info(`[INFO] ${formatMessage(message, context)}`, ...args);
    }
  },

  /**
   * Warning logs - shown in all environments
   */
  warn: (message: string, context?: LogContext, ...args: unknown[]) => {
    console.warn(`[WARN] ${formatMessage(message, context)}`, ...args);
  },

  /**
   * Error logs - shown in all environments
   * Ready for future integration with error monitoring services
   */
  error: (message: string, error?: unknown, context?: LogContext) => {
    const formattedMessage = formatMessage(message, context);
    console.error(`[ERROR] ${formattedMessage}`, error);

    // TODO: Future integration with error monitoring
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   Sentry.captureException(error, { extra: { message: formattedMessage, context } });
    // }
  },

  /**
   * Create a scoped logger for a specific component
   */
  scope: (component: string) => ({
    debug: (message: string, action?: string, ...args: unknown[]) =>
      logger.debug(message, { component, action }, ...args),
    info: (message: string, action?: string, ...args: unknown[]) =>
      logger.info(message, { component, action }, ...args),
    warn: (message: string, action?: string, ...args: unknown[]) =>
      logger.warn(message, { component, action }, ...args),
    error: (message: string, error?: unknown, action?: string) =>
      logger.error(message, error, { component, action }),
  }),
};
