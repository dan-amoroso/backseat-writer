import type { EditorThemeClasses } from 'lexical';

const classes: EditorThemeClasses = {
	paragraph: 'bsw-paragraph',
	heading: {
		h1: 'bsw-h1',
		h2: 'bsw-h2',
		h3: 'bsw-h3',
		h4: 'bsw-h4',
		h5: 'bsw-h5',
		h6: 'bsw-h6',
	},
	text: {
		bold: 'bsw-bold',
		italic: 'bsw-italic',
		underline: 'bsw-underline',
		strikethrough: 'bsw-strikethrough',
		code: 'bsw-code-inline',
	},
	quote: 'bsw-quote',
	link: 'bsw-link',
	code: 'bsw-code-block',
	target: 'bsw-target',
	list: {
		ul: 'bsw-ul',
		ol: 'bsw-ol',
		listitem: 'bsw-listitem',
		nested: {
			listitem: 'bsw-nested-listitem',
		},
	},
};

export default classes;
