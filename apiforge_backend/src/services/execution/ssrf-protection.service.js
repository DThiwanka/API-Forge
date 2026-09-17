import dns from 'node:dns';
import net from 'node:net';
import { AppError } from '../../utils/appError.js';
import env from '../../config/env.js';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

/**
 * Convert an IPv4 string into a 32-bit unsigned integer
 * @param {string} ip 
 * @returns {number}
 */
function ipv4ToNumber(ip) {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

/**
 * Check if an IPv4 address is in a private, loopback, link-local, or reserved subnet
 * @param {string} ip 
 * @returns {boolean} true if private/restricted
 */
export function isPrivateIPv4(ip) {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid format treated as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private RFC 1918)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private RFC 1918)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private RFC 1918)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local & cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier NAT / Alibaba metadata 100.100.100.200)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && parts[2] === 2) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && parts[2] === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Broadcast)
  if (a >= 240) return true;

  return false;
}

/**
 * Check if an IPv6 address is in a private, loopback, link-local, or reserved subnet
 * @param {string} ip 
 * @returns {boolean} true if private/restricted
 */
export function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase().trim();

  // Loopback & unspecified
  if (normalized === '::1' || normalized === '::' || normalized === '0:0:0:0:0:0:0:1' || normalized === '0:0:0:0:0:0:0:0') {
    return true;
  }

  // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const remainder = normalized.slice(7);
    if (remainder.includes('.')) {
      return isPrivateIPv4(remainder);
    }
  }

  // Unique local addresses fc00::/7 (fc00:: - fdff:...)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Link-local addresses fe80::/10 (fe80:: - febf:...)
  if (/^fe[89ab]/i.test(normalized)) {
    return true;
  }

  // Multicast ff00::/8
  if (normalized.startsWith('ff')) {
    return true;
  }

  return false;
}

/**
 * Check if a hostname or IP is loopback
 * @param {string} target 
 * @returns {boolean}
 */
export function isLoopback(target) {
  const normalized = target.toLowerCase().trim();
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;

  const version = net.isIP(normalized);
  if (version === 4) {
    const parts = normalized.split('.').map((p) => parseInt(p, 10));
    return parts[0] === 127;
  }
  if (version === 6) {
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    if (normalized.startsWith('::ffff:')) {
      const rem = normalized.slice(7);
      if (rem.includes('.')) {
        const parts = rem.split('.').map((p) => parseInt(p, 10));
        return parts[0] === 127;
      }
    }
  }
  return false;
}

/**
 * Validates whether an IP address is considered private or restricted.
 * @param {string} ip 
 * @returns {boolean}
 */
export function isPrivateIP(ip) {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateIPv4(ip);
  }
  if (version === 6) {
    return isPrivateIPv6(ip);
  }
  return true; // Not a recognized IP, consider restricted
}

/**
 * Validates a target URL against SSRF rules:
 * - Allowed schemes: strictly http: and https:
 * - Blocked hostnames: localhost, cloud metadata, etc.
 * - DNS resolution: resolves host and ensures no resolved IP is private/loopback/cloud-metadata.
 * 
 * @param {string} targetUrl 
 * @param {object} [options={}]
 * @param {boolean} [options.allowLocalTargets=false] - For test suites only
 * @returns {Promise<URL>} Parsed URL object if validated
 */
export async function validateTargetUrl(targetUrl, options = {}) {
  const allowLocal = options.allowLocalTargets ?? env.ALLOW_LOCAL_TARGETS;

  if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    throw new AppError('Target URL is required for execution', 400);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl.trim());
  } catch {
    throw new AppError(`Invalid target URL format: '${targetUrl}'`, 400);
  }

  // 1. Protocol validation: strictly http: or https:
  const protocol = parsedUrl.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new AppError(
      `Unsupported protocol '${parsedUrl.protocol}'. Only 'http:' and 'https:' are allowed.`,
      400
    );
  }

  // 2. Check credentials in URL (disallow embedded credentials for security)
  if (parsedUrl.username || parsedUrl.password) {
    throw new AppError('Credentials in URL are not permitted for security reasons', 400);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 3. Fast hostname checks
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal')) {
    throw new AppError(`Target host '${hostname}' is restricted by SSRF protection`, 403);
  }

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    if (!allowLocal) {
      throw new AppError(`Target host '${hostname}' is restricted by SSRF protection`, 403);
    }
  }

  // 4. If hostname is directly an IP address
  const ipVersion = net.isIP(hostname);
  if (ipVersion !== 0) {
    if (isPrivateIP(hostname)) {
      if (!allowLocal || !isLoopback(hostname)) {
        throw new AppError(`Target address '${hostname}' is restricted by SSRF protection`, 403);
      }
    }
    return parsedUrl;
  }

  // 5. Hostname DNS resolution
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new AppError(`Cannot resolve hostname: '${hostname}'`, 502);
    }

    for (const record of addresses) {
      if (isPrivateIP(record.address)) {
        if (!allowLocal || !isLoopback(record.address)) {
          throw new AppError(
            `Target host '${hostname}' resolved to restricted IP '${record.address}'`,
            403
          );
        }
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`DNS resolution failed for '${hostname}': ${err.message}`, 502);
  }

  return parsedUrl;
}

export default {
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateIP,
  validateTargetUrl,
};
