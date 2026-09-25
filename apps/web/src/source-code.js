// Excerpts retain exact source text/ranges in metadata. Only their display is dedented.
export function snippetText(source) {
  const text =
    source.code ?? source.excerpt?.replace(/^\d+  /gm, '') ?? 'Excerpt unavailable.';
  const lines = text.split('\n');
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.match(/^[\t ]*/)[0]);
  const shared = indents.reduce((prefix, indent) => {
    let length = 0;
    while (length < prefix.length && prefix[length] === indent[length]) length++;
    return prefix.slice(0, length);
  }, indents[0] ?? '');
  return lines
    .map((line) => (line.startsWith(shared) ? line.slice(shared.length) : line))
    .join('\n');
}
