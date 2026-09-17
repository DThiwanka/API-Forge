/**
 * Browser Engine Service
 *
 * Provides a clean server-side abstraction over Playwright Chromium / isolated browser engine.
 * Ensures strict context isolation, resource bounds, and safe disposal.
 */

let playwrightInstance = null;
let chromiumBrowser = null;
let isPlaywrightAvailable = null;

/**
 * Checks if Playwright is installed and can be imported
 */
async function getPlaywright() {
  if (isPlaywrightAvailable === false) return null;
  if (playwrightInstance) return playwrightInstance;

  try {
    const pw = await import('playwright');
    playwrightInstance = pw.default || pw;
    isPlaywrightAvailable = true;
    return playwrightInstance;
  } catch {
    isPlaywrightAvailable = false;
    return null;
  }
}

/**
 * Gets or initializes the shared headless Chromium instance
 */
async function getChromiumBrowser() {
  if (chromiumBrowser) {
    if (chromiumBrowser.isConnected && chromiumBrowser.isConnected()) {
      return chromiumBrowser;
    }
  }

  const pw = await getPlaywright();
  if (!pw || !pw.chromium) {
    return null;
  }

  try {
    chromiumBrowser = await pw.chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
      ],
    });
    return chromiumBrowser;
  } catch (err) {
    console.warn('[BrowserService] Playwright launch unavailable, using isolated engine driver:', err.message);
    isPlaywrightAvailable = false;
    return null;
  }
}

/**
 * Lightweight Isolated Engine Page Driver (used when native Playwright Chromium binary is not installed)
 */
class IsolatedPageDriver {
  constructor(options = {}) {
    this._url = options.url || 'about:blank';
    this._title = options.title || 'New Tab';
    this._status = null;
    this._headers = {};
    this._history = [];
    this._historyIndex = -1;
    this._isClosed = false;
    this._contentPreview = '';
  }

  url() {
    return this._url;
  }

  async title() {
    return this._title;
  }

  async close() {
    this._isClosed = true;
  }

  async goto(targetUrl, options = {}) {
    if (this._isClosed) throw new Error('Page is already closed');
    const timeout = options.timeout || 15000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 APIForge/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timer);

      this._url = response.url || targetUrl;
      this._status = response.status;
      this._headers = Object.fromEntries(response.headers.entries());

      const contentType = (this._headers['content-type'] || '').toLowerCase();
      let bodyText = '';

      if (contentType.includes('text') || contentType.includes('json') || contentType.includes('xml')) {
        bodyText = await response.text();
      }

      // Extract title from HTML if available
      const titleMatch = bodyText.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        this._title = titleMatch[1].trim();
      } else {
        const parsed = new URL(this._url);
        this._title = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
      }

      // Store a safe sanitized preview (max 50KB)
      this._contentPreview = bodyText.slice(0, 50000);

      // Track history
      if (this._historyIndex === -1 || this._history[this._historyIndex] !== this._url) {
        this._history = this._history.slice(0, this._historyIndex + 1);
        this._history.push(this._url);
        this._historyIndex = this._history.length - 1;
      }

      return {
        status: () => this._status,
        url: () => this._url,
        headers: () => this._headers,
      };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Navigation timeout of ${timeout}ms exceeded`);
      }
      throw err;
    }
  }

  async goBack() {
    if (this._historyIndex > 0) {
      this._historyIndex -= 1;
      const prevUrl = this._history[this._historyIndex];
      return this.goto(prevUrl);
    }
    return null;
  }

  async goForward() {
    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex += 1;
      const nextUrl = this._history[this._historyIndex];
      return this.goto(nextUrl);
    }
    return null;
  }

  async reload() {
    if (this._url && this._url !== 'about:blank') {
      return this.goto(this._url);
    }
    return null;
  }
}

/**
 * Isolated Context wrapper
 */
class IsolatedContextDriver {
  constructor() {
    this.pages = [];
    this.isClosed = false;
  }

  async newPage() {
    if (this.isClosed) throw new Error('Context is closed');
    const page = new IsolatedPageDriver();
    this.pages.push(page);
    return page;
  }

  async close() {
    this.isClosed = true;
    for (const page of this.pages) {
      await page.close();
    }
    this.pages = [];
  }
}

/**
 * Creates an isolated browser context for a session
 */
export async function createIsolatedBrowserContext() {
  const browser = await getChromiumBrowser();
  if (browser) {
    try {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 APIForge/1.0',
        ignoreHTTPSErrors: false,
      });
      return context;
    } catch (err) {
      console.warn('[BrowserService] Failed to create Playwright context, falling back to driver:', err.message);
    }
  }

  return new IsolatedContextDriver();
}

/**
 * Closes an isolated browser context safely
 */
export async function closeIsolatedBrowserContext(context) {
  if (!context) return;
  try {
    await context.close();
  } catch {
    // Ignore already closed errors
  }
}

/**
 * Cleanly closes the browser instance on process termination
 */
export async function shutdownBrowserService() {
  if (chromiumBrowser) {
    try {
      await chromiumBrowser.close();
    } catch {
      // Ignore
    }
    chromiumBrowser = null;
  }
}

export default {
  createIsolatedBrowserContext,
  closeIsolatedBrowserContext,
  shutdownBrowserService,
};

