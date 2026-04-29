/**
 * src/checks/links.js
 * Checks for broken or invalid links on the page.
 */

export async function runLinkChecks(snapshot, globalCache = {}) {
  const issues = [];
  const links = snapshot.links || [];
  
  const uniquePageLinks = [...new Set(links.map(l => l.href).filter(url => url && url.startsWith('http')))];

  if (uniquePageLinks.length === 0) return [];

  const results = await Promise.all(
    uniquePageLinks.map(async (url) => {
      if (globalCache[url] !== undefined) return globalCache[url];

      try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        let isOk = response.ok;
        let status = response.status;

        if (!isOk) {
          const getRes = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
          isOk = getRes.ok;
          status = getRes.status;
        }

        const result = isOk ? null : { url, status };
        globalCache[url] = result;
        return result;
      } catch (err) {
        const result = { url, status: 'TIMEOUT/ERROR' };
        globalCache[url] = result;
        return result;
      }
    })
  );

  results.filter(Boolean).forEach(fail => {
    issues.push({
      type: "error",
      category: "seo",
      rule: "broken-link",
      title: "Broken Link Detected",
      detail: `The link to ${fail.url} returned status: ${fail.status}`,
      selector: `a[href="${fail.url}"]`
    });
  });

  return issues;
}
