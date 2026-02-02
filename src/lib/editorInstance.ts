import { writable } from "svelte/store";
import type { LexicalEditor } from "lexical";

export const editorInstance = writable<LexicalEditor | null>(null);
