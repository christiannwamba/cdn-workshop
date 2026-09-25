import { createHighlighterCore, createCssVariablesTheme } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import javascript from '@shikijs/langs/javascript';
import typescript from '@shikijs/langs/typescript';
import json from '@shikijs/langs/json';
// Use Geist's live design tokens rather than a separate fixed color palette.
const geist = createCssVariablesTheme({ name: 'geist', fontStyle: false });

const highlighter = createHighlighterCore({
  themes: [geist],
  langs: [javascript, typescript, json],
  engine: createJavaScriptRegexEngine(),
});
export async function highlight(code, lang) {
  return (await highlighter).codeToHtml(code, {
    lang,
    theme: 'geist',
  });
}
