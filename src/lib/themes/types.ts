import type { EditorThemeClasses } from 'lexical';

export interface EditorTheme {
	name: string;
	classes: EditorThemeClasses;
	styles: string;
}
