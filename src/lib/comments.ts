import { get } from "svelte/store";
import { createPersistentStore } from "$lib/storage";

export interface Comment {
  id: string;
  targetId: string;
  targetText: string;
  author: string;
  body: string;
}

export const comments = createPersistentStore<Comment[]>("comments", []);

let nextId = Date.now();

comments.update((list) =>
  list.map((comment) => ({
    ...comment,
    targetText: comment.targetText ?? "",
  })),
);

export function addComment(
  targetId: string,
  targetText: string,
  author: string,
  body: string,
): Comment {
  const comment: Comment = {
    id: `comment-${nextId++}`,
    targetId,
    targetText,
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

export function deleteAllComments() {
  comments.set([]);
}

(window as any).addComment = addComment;
(window as any).removeComment = removeComment;
(window as any).listComments = () => get(comments);
(window as any).deleteAllComments = deleteAllComments;
