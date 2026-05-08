const https = require('https');
const { URL } = require('url');

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; pro-workflow/wiki-research-loop)',
        Accept: 'text/html,application/xhtml+xml',
        ...headers,
      },
    };
    https.get(opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : `https://${u.hostname}${res.headers.location}`;
        return httpsGet(loc, headers).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function extractDuckDuckGoLite(html, limit) {
  const out = [];
  const linkRe = /<a[^>]+class="result-link"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snipRe = /<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g;
  const links = [];
  let m;
  while ((m = linkRe.exec(html)) !== null) links.push({ url: m[1], title: stripTags(m[2]) });
  const snippets = [];
  while ((m = snipRe.exec(html)) !== null) snippets.push(stripTags(m[1]));
  for (let i = 0; i < Math.min(limit, links.length); i++) {
    out.push({
      url: links[i].url,
      title: links[i].title,
      content: snippets[i] || '',
      fetched_at: new Date().toISOString(),
    });
  }
  return out;
}

module.exports = {
  name: 'web',
  match: () => true,
  estimateCost: () => ({ usd: 0, tokens: 0 }),
  async fetch(query, opts = {}) {
    const limit = opts.limit || 3;
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const res = await httpsGet(url);
    if (res.status !== 200) return [];
    return extractDuckDuckGoLite(res.body, limit);
  }
};
