import { writable, get } from 'svelte/store';

export interface Comment {
	id: string;
	targetId: string;
	author: string;
	body: string;
}

const STORAGE_KEY = 'backseatwriter:comments';

function loadComments(): Comment[] {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved) {
		try {
			return JSON.parse(saved);
		} catch {
			return [];
		}
	}
	return [];
}

function persist(comments: Comment[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
}

export const comments = writable<Comment[]>(loadComments());

comments.subscribe(persist);

let nextId = Date.now();

export function addComment(targetId: string, author: string, body: string): Comment {
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
