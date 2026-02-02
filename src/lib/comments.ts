import { get } from "svelte/store";
import { createPersistentStore } from "$lib/storage";

export interface Comment {
  id: string;
  targetId: string;
  author: string;
  body: string;
}

export const comments = createPersistentStore<Comment[]>("comments", []);

let nextId = Date.now();

export function addComment(
  targetId: string,
  author: string,
  body: string,
): Comment {
  const comment: Comment = {
    id: `comment-${nextId++}`,
    targetId,
    author,
    body,
  };
  comments.update((list) => [...list, comment]);
  return comment;
}

export function removeComment(id: string): boolean {
  let found = false;
  comments.update((list) => {
    const filtered = list.filter((c) => c.id !== id);
    found = filtered.length < list.length;
    return filtered;
  });
  return found;
}

(window as any).addComment = addComment;
(window as any).removeComment = removeComment;
(window as any).listComments = () => get(comments);
