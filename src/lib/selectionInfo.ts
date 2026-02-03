import { writable } from "svelte/store";

export interface SelectionInfo {
  text: string;
  anchorRect: DOMRect;
}

export const selectionInfo = writable<SelectionInfo | null>(null);
