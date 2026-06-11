/* eslint-disable no-console */

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const BASE_SITE_URL = 'https://www.sia.aviation-civile.gouv.fr/';
const SEARCH_PATH = 'catalogsearch/result/?q=eaip';
const execFileAsync = promisify(execFile);

const REFERENCE = {
  year: 2026,
  cycle: 6,
  effectiveDateUtc: Date.UTC(2026, 5, 11),
};

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

async function fetchText(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTextWithFallback(url) {
  try {
    return await fetchText(url);
  } catch {
    if (process.platform === 'win32') {
      const escapedUrl = url.replace(/'/g, "''");
      const psCommand = [
        "$ProgressPreference='SilentlyContinue'",
        `(Invoke-WebRequest -Uri '${escapedUrl}' -UseBasicParsing -TimeoutSec 60).Content`,
      ].join('; ');

      try {
        const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', psCommand], {
          maxBuffer: 20 * 1024 * 1024,
        });

        if (stdout && stdout.trim().length > 0) {
          return stdout;
        }
      } catch {
        // Fall through to curl fallback.
      }
    }

    try {
      const { stdout } = await execFileAsync('curl', ['-fsSL', url], {
        maxBuffer: 20 * 1024 * 1024,
      });

      if (stdout && stdout.trim().length > 0) {
        return stdout;
      }
    } catch {
      // No-op: throw unified error below.
    }

    throw new Error(`Unable to download page content for ${url}`);
  }
}

function extractCycles(html) {
  const cycles = [];
  const seen = new Set();
  const cycleRegex = /ZIP\s*eAIP\s*Complet\s*AIRAC\s*(\d{2})\/(\d{2})/gi;
  let match;

  while ((match = cycleRegex.exec(html)) !== null) {
    const cycle = Number.parseInt(match[1], 10);
    const yearShort = Number.parseInt(match[2], 10);
    const year = 2000 + yearShort;
    const key = `${cycle}/${year}`;

    if (!seen.has(key)) {
      seen.add(key);
      cycles.push({ cycle, year, yearShort });
    }
  }

  return cycles;
}

function findLatestCycle(cycles) {
  if (cycles.length === 0) {
    throw new Error('No AIRAC cycle found in SIA search page.');
  }

  return cycles.sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }

    return b.cycle - a.cycle;
  })[0];
}

function computeEffectiveDateUtc(year, cycle) {
  const refIndex = REFERENCE.year * 13 + REFERENCE.cycle;
  const targetIndex = year * 13 + cycle;
  const deltaCycles = targetIndex - refIndex;
  const msPerDay = 24 * 60 * 60 * 1000;
  const effectiveMs = REFERENCE.effectiveDateUtc + deltaCycles * 28 * msPerDay;
  return new Date(effectiveMs);
}

function formatEaipToken(date) {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const year = date.getUTCFullYear();
  return `${day}_${month}_${year}`;
}

function formatIsoDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeHref(baseUrl, href) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

function extractCatalogUrl(html, baseUrl, cycle, yearShort) {
  const slugRegex = new RegExp(`href=["']([^"']*zip-eaip-complet-airac-${String(cycle).padStart(2, '0')}-${String(yearShort).padStart(2, '0')}\\.html[^"']*)["']`, 'i');
  const slugMatch = html.match(slugRegex);

  if (slugMatch && slugMatch[1]) {
    const resolved = normalizeHref(baseUrl, slugMatch[1]);
    if (resolved) {
      return resolved;
    }
  }

  return `${baseUrl}zip-eaip-complet-airac-${String(cycle).padStart(2, '0')}-${String(yearShort).padStart(2, '0')}.html`;
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.argv[2] || BASE_SITE_URL);
  const searchUrl = new URL(SEARCH_PATH, baseUrl).href;
  const html = await fetchTextWithFallback(searchUrl);

  const cycles = extractCycles(html);
  const latest = findLatestCycle(cycles);
  const effectiveDate = computeEffectiveDateUtc(latest.year, latest.cycle);
  const eaipToken = formatEaipToken(effectiveDate);
  const isoDate = formatIsoDate(effectiveDate);

  const eaipEnVigueurUrl = `${baseUrl}documents/htmlshow?f=dvd/eAIP_${eaipToken}/FRANCE/home.html`;
  const enr56Url = `${baseUrl}media/dvd/eAIP_${eaipToken}/FRANCE/AIRAC-${isoDate}/html/eAIP/FR-ENR-5.6-fr-FR.html#ENR-5.6-1`;
  const latestEaipCatalogUrl = extractCatalogUrl(html, baseUrl, latest.cycle, latest.yearShort);

  const result = {
    sourceSearchUrl: searchUrl,
    latestAirac: {
      cycle: `${String(latest.cycle).padStart(2, '0')}/${String(latest.yearShort).padStart(2, '0')}`,
      year: latest.year,
      cycleNumber: latest.cycle,
      effectiveDate: isoDate,
    },
    latestEaipUrl: latestEaipCatalogUrl,
    eaipEnVigueurUrl,
    enr56Url,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`Failed to extract eAIP links: ${error.message}`);
  process.exitCode = 1;
});
