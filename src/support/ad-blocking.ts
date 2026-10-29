import type { BrowserContext } from '@playwright/test';

/**
 * Entry points of the ad and consent stack. Recon showed the site itself loads only
 * adsbygoogle.js from googlesyndication.com; the consent dialog, the vignette and about
 * 60 other ad hosts are all loaded by that script. Blocking these four roots gave the same
 * result as blocking all 18 observed ad hosts. See README, "Handling ads and pop-ups".
 */
export const BLOCKED_HOST_SUFFIXES = [
  'googlesyndication.com',
  'doubleclick.net',
  'adtrafficquality.google',
  'fundingchoicesmessages.google.com',
] as const;

export function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

/** Applies to every page and popup in the context, not only the first page. */
export async function blockAds(context: BrowserContext): Promise<void> {
  await context.route(
    (url) => isBlockedHost(url.hostname),
    (route) => route.abort('blockedbyclient'),
  );
}
