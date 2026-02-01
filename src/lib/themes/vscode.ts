import type { EditorTheme } from './types';
import classes from './classes';

const styles = `
.editor-container {
	background: #1e1e1e;
	border: 1px solid #3c3c3c;
	border-radius: 4px;
	font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
	color: #d4d4d4;
}

.editor {
	min-height: 400px;
	padding: 16px 20px;
	outline: none;
	font-size: 14px;
	line-height: 1.6;
	caret-color: #aeafad;
	tab-size: 4;
}

.bsw-paragraph {
	margin: 0 0 4px;
	color: #d4d4d4;
}

.bsw-h1 {
	font-size: 2em;
	color: #569cd6;
	border-bottom: 1px solid #3c3c3c;
	padding-bottom: 6px;
	margin: 16px 0 8px;
}

.bsw-h2 {
	font-size: 1.5em;
	color: #4ec9b0;
	border-bottom: 1px solid #3c3c3c;
	padding-bottom: 4px;
	margin: 14px 0 6px;
}

.bsw-h3 {
	font-size: 1.25em;
	color: #9cdcfe;
	margin: 12px 0 4px;
}

.bsw-h4 {
	font-size: 1.1em;
	color: #9cdcfe;
	margin: 10px 0 4px;
}

.bsw-h5 {
	font-size: 1em;
	color: #9cdcfe;
	margin: 8px 0 4px;
}

.bsw-h6 {
	font-size: 0.9em;
	color: #808080;
	margin: 8px 0 4px;
}

.bsw-bold {
	font-weight: 700;
	color: #569cd6;
}

.bsw-italic {
	font-style: italic;
	color: #c586c0;
}

.bsw-underline {
	text-decoration: underline;
	text-decoration-color: #808080;
	text-underline-offset: 2px;
}

.bsw-strikethrough {
	text-decoration: line-through;
	color: #808080;
}

.bsw-code-inline {
	font-family: inherit;
	background: #2d2d2d;
	border: 1px solid #3c3c3c;
	border-radius: 3px;
	padding: 1px 5px;
	font-size: 0.9em;
	color: #ce9178;
}

.bsw-code-block {
	display: block;
	background: #1a1a1a;
	border: 1px solid #3c3c3c;
	border-radius: 4px;
	padding: 12px 16px;
	margin: 8px 0;
	font-size: 13px;
	line-height: 1.5;
	color: #d4d4d4;
	overflow-x: auto;
}

.bsw-quote {
	border-left: 3px solid #569cd6;
	margin: 8px 0;
	padding: 4px 16px;
	color: #9da5b4;
	background: rgba(86, 156, 214, 0.05);
}

.bsw-link {
	color: #3794ff;
	text-decoration: none;
}

.bsw-link:hover {
	text-decoration: underline;
}

.bsw-ul,
.bsw-ol {
	margin: 4px 0;
	padding-left: 24px;
}

.bsw-listitem {
	margin: 2px 0;
	color: #d4d4d4;
}

.bsw-listitem::marker {
	color: #808080;
}

.bsw-nested-listitem {
	list-style-type: none;
}

.bsw-target {
	background: transparent;
	color: inherit;
	border-radius: 2px;
	transition: background-color 0.2s ease;
}

.bsw-target[data-active="true"] {
	background: rgba(86, 156, 214, 0.25);
}

.editor ::selection {
	background: #264f78;
}
`;

const theme: EditorTheme = { name: 'VS Code Dark', classes, styles };

export default theme;
