// Palette roles come from https://vercel.com/geist/code-block (September 2026).
// Shiki uses these same CSS variables directly. Monaco requires concrete hex colors.
export function registerGeistEditorTheme(monaco) {
  const probe = document.createElement('span');
  probe.hidden = true;
  document.body.append(probe);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const color = (variable) => {
    probe.style.color = `var(${variable})`;
    // Resolve light-dark()/OKLCH tokens through CSS, then convert to sRGB for Monaco.
    context.fillStyle = getComputedStyle(probe).color;
    context.fillRect(0, 0, 1, 1);
    return (
      '#' +
      [...context.getImageData(0, 0, 1, 1).data]
        .slice(0, 3)
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')
    );
  };
  try {
    const foreground = color('--shiki-foreground');
    monaco.editor.defineTheme('geist', {
      base: document.documentElement.dataset.theme === 'dark' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [
        { token: '', foreground },
        { token: 'identifier', foreground },
        { token: 'keyword', foreground: color('--shiki-token-keyword') },
        { token: 'string', foreground: color('--shiki-token-string') },
        { token: 'comment', foreground: color('--shiki-token-comment') },
        { token: 'number', foreground: color('--shiki-token-constant') },
        { token: 'operator', foreground: color('--shiki-token-punctuation') },
        { token: 'delimiter', foreground: color('--shiki-token-punctuation') },
      ],
      colors: {
        'editor.background': color('--shiki-background'),
        'editor.foreground': foreground,
        'editorLineNumber.foreground': color('--ds-gray-900'),
        'editorLineNumber.activeForeground': foreground,
        'editorCursor.foreground': foreground,
        'editor.selectionBackground': color('--ds-blue-200'),
        'editor.inactiveSelectionBackground': color('--ds-gray-200'),
      },
    });
  } finally {
    probe.remove();
  }
  return 'geist';
}
