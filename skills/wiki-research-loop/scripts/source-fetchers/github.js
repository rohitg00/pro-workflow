const https = require('https');

function httpsGet(url, headers = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const opts = { headers: { 'User-Agent': 'pro-workflow/wiki-research-loop', Accept: 'application/vnd.github+json', ...headers } };
    const req = https.get(url, opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return httpsGet(res.headers.location, headers, redirects + 1).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('github fetch timeout')));
    req.on('error', reject);
  });
}

function authHeader() {
  const tok = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

module.exports = {
  name: 'github',
  match: () => true,
  estimateCost: () => ({ usd: 0, tokens: 0 }),
  async fetch(query, opts = {}) {
    const limit = opts.limit ?? 3;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=${limit}`;
    try {
      const res = await httpsGet(url, authHeader());
      if (res.status !== 200) return [];
      const json = JSON.parse(res.body);
      const items = json.items || [];
      return items.map(r => {
        const desc = r.description || '';
        const stars = r.stargazers_count || 0;
        return {
          title: r.full_name,
          content: `${desc} (${stars}★, ${r.language || 'unknown'})`,
          url: r.html_url,
          fetched_at: new Date().toISOString(),
        };
      });
    } catch {
      return [];
    }
  }
};
