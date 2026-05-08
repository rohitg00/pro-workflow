const https = require('https');
const { URL } = require('url');

function httpsGet(url, headers = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
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
    const req = https.get(opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const loc = new URL(res.headers.location, u).toString();
        return httpsGet(loc, headers, redirects + 1).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('web fetch timeout')));
    req.on('error', reject);
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
