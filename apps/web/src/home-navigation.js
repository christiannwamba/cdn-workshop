// Keep catalog context per browser tab, including the separate R32 UI service.
const key = 'workshop-home';
export const homeChange = 'workshop-home-change';
export const canonicalHome = (hash) =>
  /^#(?:home|home-bare|index)(?:\?|$)/.test(hash)
    ? hash.replace(/^#(?:index|home-bare)(?=\?|$)/, '#home')
    : hash === '' || hash === '#'
      ? '#home'
      : null;

export function rememberHome(hash) {
  const home = canonicalHome(hash);
  if (!home) return;
  try {
    sessionStorage.setItem(key, home);
  } catch {}
  window.dispatchEvent(new Event(homeChange));
}
export function homeHref() {
  const current = canonicalHome(location.hash);
  if (current) return current;
  try {
    return canonicalHome(sessionStorage.getItem(key) || '#home') || '#home';
  } catch {
    return '#home';
  }
}
export function pageFromHash() {
  const home = canonicalHome(location.hash);
  if (home) {
    if (location.hash !== home) history.replaceState(history.state, '', home);
    return 'home';
  }
  const [page, query = ''] = location.hash.slice(1).split('?');
  const returning = new URLSearchParams(query).get('home');
  if (returning) rememberHome(returning);
  return page;
}
export function exerciseHref(profile) {
  return profile.localPreview || profile.surface === 'request'
    ? '#r32'
    : `${profile.requestUrl}/#r32?${new URLSearchParams({ home: homeHref() })}`;
}
