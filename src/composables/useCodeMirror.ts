import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const codeHighlight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.comment, color: '#8b949e', fontStyle: 'italic' },
  { tag: tags.meta, color: '#79c0ff' },
  { tag: tags.tagName, color: '#ff7b72' },
  { tag: tags.attributeName, color: '#ffd56b' },
  { tag: tags.attributeValue, color: '#7ee787' },
  { tag: tags.string, color: '#7ee787' },
  { tag: tags.number, color: '#ffb86c' },
  { tag: tags.keyword, color: '#ff79c6' },
  { tag: tags.bracket, color: '#c0caf5' },
  { tag: tags.name, color: '#d2a8ff' },
  { tag: tags.variableName, color: '#e6edf3' },
  { tag: tags.propertyName, color: '#79c0ff' },
  { tag: tags.operator, color: '#ffb86c' },
  { tag: tags.content, color: '#e6edf3' },
  { tag: tags.regexp, color: '#7ee787' },
]))

export const codeTheme = EditorView.theme({
  '&': { backgroundColor: '#1e1e2e', color: '#e6edf3', height: '100%', fontSize: '12px' },
  '.cm-gutters': { backgroundColor: '#1e1e2e', color: '#6e7681', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: '#2a2d3e' },
  '.cm-activeLine': { backgroundColor: '#2a2d3e' },
  '.cm-cursor': { borderLeftColor: '#c0caf5' },
  '.cm-selectionBackground': { backgroundColor: '#264f7844' },
  '.cm-matchingBracket': { backgroundColor: '#2e3a4d', outline: '1px solid #79c0ff44' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#264f7866' },
  '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Consolas', monospace", lineHeight: '1.6' },
}, { dark: true })

export function updateCodeView(view: EditorView, code: string) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: code },
  })
}

export function createCodeView(parent: HTMLElement, code: string, lang: 'html' | 'js' = 'js', readOnly = false) {
  return new EditorView({
    state: EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        lang === 'html' ? html() : javascript(),
        codeHighlight,
        codeTheme,
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ],
    }),
    parent,
  })
}
