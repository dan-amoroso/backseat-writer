import type { EditorTheme } from "./types";
import classes from "./classes";

const styles = `
.editor-container {
	background: #1c1b19;
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 8px;
	font-family: 'Newsreader', 'Charter', 'Georgia', serif;
	color: #c8c4be;
}

.editor {
	min-height: 400px;
	padding: 32px 36px;
	outline: none;
	font-size: 17px;
	line-height: 1.75;
	caret-color: #d4a054;
	tab-size: 4;
}

.bsw-paragraph {
	margin: 0 0 8px;
	color: #c8c4be;
}

.bsw-h1 {
	font-size: 2em;
	font-weight: 500;
	color: #e8e0d4;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	padding-bottom: 8px;
	margin: 20px 0 12px;
	letter-spacing: -0.01em;
}

.bsw-h2 {
	font-size: 1.5em;
	font-weight: 500;
	color: #d4a054;
	border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	padding-bottom: 6px;
	margin: 16px 0 8px;
}

.bsw-h3 {
	font-size: 1.25em;
	font-weight: 500;
	color: #c0a878;
	margin: 14px 0 6px;
}

.bsw-h4 {
	font-size: 1.1em;
	font-weight: 500;
	color: #b0a080;
	margin: 12px 0 4px;
}

.bsw-h5 {
	font-size: 1em;
	font-weight: 500;
	color: #a09880;
	margin: 10px 0 4px;
}

.bsw-h6 {
	font-size: 0.9em;
	font-weight: 500;
	color: #807868;
	margin: 8px 0 4px;
}

.bsw-bold {
	font-weight: 700;
	color: #e0d8cc;
}

.bsw-italic {
	font-style: italic;
	color: #b8a890;
}

.bsw-underline {
	text-decoration: underline;
	text-decoration-color: #6a6050;
	text-underline-offset: 3px;
}

.bsw-strikethrough {
	text-decoration: line-through;
	color: #706860;
}

.bsw-code-inline {
	font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 3px;
	padding: 1px 5px;
	font-size: 0.85em;
	color: #d4a054;
}

.bsw-code-block {
	display: block;
	font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
	background: rgba(0, 0, 0, 0.2);
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 6px;
	padding: 14px 18px;
	margin: 10px 0;
	font-size: 13px;
	line-height: 1.5;
	color: #c8c4be;
	overflow-x: auto;
}

.bsw-quote {
	border-left: 3px solid #d4a054;
	margin: 10px 0;
	padding: 6px 20px;
	color: #a09888;
	background: rgba(212, 160, 84, 0.03);
	font-style: italic;
}

.bsw-link {
	color: #d4a054;
	text-decoration: underline;
	text-decoration-color: rgba(212, 160, 84, 0.3);
	text-underline-offset: 2px;
}

.bsw-link:hover {
	text-decoration-color: #d4a054;
}

.bsw-ul,
.bsw-ol {
	margin: 6px 0;
	padding-left: 28px;
}

.bsw-listitem {
	margin: 3px 0;
	color: #c8c4be;
}

.bsw-listitem::marker {
	color: #6a6050;
}

.bsw-nested-listitem {
	list-style-type: none;
}

.bsw-target {
	background: transparent;
	color: inherit;
	border-radius: 2px;
	box-decoration-break: clone;
	-webkit-box-decoration-break: clone;
	border-bottom: 2px solid transparent;
	transition: background-color 0.2s ease, border-color 0.2s ease;
}

.bsw-target[data-has-comments="true"] {
	background: rgba(212, 160, 84, 0.12);
	border-bottom-color: rgba(212, 160, 84, 0.35);
}

.bsw-target[data-active="true"] {
	background: rgba(212, 160, 84, 0.22);
	border-bottom-color: #d4a054;
}

.editor ::selection {
	background: rgba(212, 160, 84, 0.2);
}
`;

const theme: EditorTheme = { name: "VS Code Dark", classes, styles };

export default theme;
