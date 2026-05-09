const https = require('https');

function httpsGet(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const req = https.get(url, { headers: { 'User-Agent': 'pro-workflow/wiki-research-loop' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return httpsGet(res.headers.location, redirects + 1).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('arxiv fetch timeout')));
    req.on('error', reject);
  });
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

function parseEntries(xml) {
  const entries = extractTag(xml, 'entry');
  return entries.map(entry => {
    const title = (extractTag(entry, 'title')[0] || '').replace(/\s+/g, ' ').trim();
    const summary = (extractTag(entry, 'summary')[0] || '').replace(/\s+/g, ' ').trim();
    const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
    const url = idMatch ? idMatch[1].trim() : null;
    const published = (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1] || null;
    return { title, content: summary, url, fetched_at: new Date().toISOString(), published };
  });
}

module.exports = {
  name: 'arxiv',
  match: () => true,
  estimateCost: () => ({ usd: 0, tokens: 0 }),
  async fetch(query, opts = {}) {
    const limit = opts.limit ?? 3;
    const q = encodeURIComponent(query);
    const url = `https://export.arxiv.org/api/query?search_query=all:${q}&start=0&max_results=${limit}`;
    try {
      const res = await httpsGet(url);
      if (res.status !== 200) return [];
      return parseEntries(res.body);
    } catch {
      return [];
    }
  }
};
