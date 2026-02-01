import type { EditorTheme } from './types';
import classes from './classes';

const styles = `
.editor-container {
	background: #2b2b2b;
	border: 1px solid #404040;
	border-radius: 4px;
	font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace;
	color: #a9b7c6;
}

.editor {
	min-height: 400px;
	padding: 16px 20px;
	outline: none;
	font-size: 14px;
	line-height: 1.6;
	caret-color: #bbbbbb;
	tab-size: 4;
}

.bsw-paragraph {
	margin: 0 0 4px;
	color: #a9b7c6;
}

.bsw-h1 {
	font-size: 2em;
	color: #ffc66d;
	border-bottom: 1px solid #404040;
	padding-bottom: 6px;
	margin: 16px 0 8px;
}

.bsw-h2 {
	font-size: 1.5em;
	color: #ffc66d;
	border-bottom: 1px solid #404040;
	padding-bottom: 4px;
	margin: 14px 0 6px;
}

.bsw-h3 {
	font-size: 1.25em;
	color: #e8bf6a;
	margin: 12px 0 4px;
}

.bsw-h4 {
	font-size: 1.1em;
	color: #e8bf6a;
	margin: 10px 0 4px;
}

.bsw-h5 {
	font-size: 1em;
	color: #e8bf6a;
	margin: 8px 0 4px;
}

.bsw-h6 {
	font-size: 0.9em;
	color: #808080;
	margin: 8px 0 4px;
}

.bsw-bold {
	font-weight: 700;
	color: #cc7832;
}

.bsw-italic {
	font-style: italic;
	color: #9876aa;
}

.bsw-underline {
	text-decoration: underline;
	text-decoration-color: #606366;
	text-underline-offset: 2px;
}

.bsw-strikethrough {
	text-decoration: line-through;
	color: #606366;
}

.bsw-code-inline {
	font-family: inherit;
	background: #323232;
	border: 1px solid #404040;
	border-radius: 3px;
	padding: 1px 5px;
	font-size: 0.9em;
	color: #6a8759;
}

.bsw-code-block {
	display: block;
	background: #232525;
	border: 1px solid #404040;
	border-radius: 4px;
	padding: 12px 16px;
	margin: 8px 0;
	font-size: 13px;
	line-height: 1.5;
	color: #a9b7c6;
	overflow-x: auto;
}

.bsw-quote {
	border-left: 3px solid #cc7832;
	margin: 8px 0;
	padding: 4px 16px;
	color: #808080;
	background: rgba(204, 120, 50, 0.05);
}

.bsw-link {
	color: #287bde;
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
	color: #a9b7c6;
}

.bsw-listitem::marker {
	color: #606366;
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
	background: rgba(204, 120, 50, 0.25);
}

.editor ::selection {
	background: #214283;
}
`;

const theme: EditorTheme = { name: 'IntelliJ Darcula', classes, styles };

export default theme;
