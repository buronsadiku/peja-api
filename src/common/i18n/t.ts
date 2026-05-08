import type { SupportedLanguage } from '../constants.js';
import { all } from './loader.js';

/**
 * Translate a key in the format "namespace:key"
 * e.g. t('auth:signup.success', 'fr')
 *
 * For interpolation, pass params:
 * t('errors:not_found', 'en', { resource: 'Event' }) => "Event not found"
 */
export function t(
  namespacedKey: string,
  locale: SupportedLanguage = 'en',
  params?: Record<string, string>,
): string {
  const colonIndex = namespacedKey.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(
      `Invalid translation key "${namespacedKey}" — use "namespace:key" format`,
    );
  }

  const namespace = namespacedKey.substring(0, colonIndex);
  const key = namespacedKey.substring(colonIndex + 1);

  let value = all[locale]?.[namespace]?.[key];

  // Fall back to English
  if (!value && locale !== 'en') {
    value = all.en?.[namespace]?.[key];
  }

  if (!value) return namespacedKey;

  // Interpolate {param} placeholders
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, v);
    }
  }

  return value;
}
