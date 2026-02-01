<script lang="ts">
	import type { Comment } from '$lib/comments';

	export let comment: Comment;

	function onMouseEnter() {
		const els = document.querySelectorAll(`mark[data-target-id="${comment.targetId}"]`);
		els.forEach((el) => el.setAttribute('data-active', 'true'));
	}

	function onMouseLeave() {
		const els = document.querySelectorAll(`mark[data-target-id="${comment.targetId}"]`);
		els.forEach((el) => el.removeAttribute('data-active'));
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="comment-bubble"
	on:mouseenter={onMouseEnter}
	on:mouseleave={onMouseLeave}
>
	<p class="comment-author">{comment.author}</p>
	<p class="comment-body">{comment.body}</p>
</div>

<style>
	.comment-bubble {
		background: #2d2d2d;
		border: 1px solid #3c3c3c;
		border-radius: 6px;
		padding: 10px 12px;
		cursor: default;
	}

	.comment-bubble:hover {
		border-color: #569cd6;
	}

	.comment-author {
		margin: 0 0 4px;
		font-size: 12px;
		font-weight: 600;
		color: #808080;
	}

	.comment-body {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: #d4d4d4;
	}
</style>
