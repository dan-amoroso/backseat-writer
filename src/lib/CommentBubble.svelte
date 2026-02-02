<script lang="ts">
  import type { Comment } from "$lib/comments";

  export let comment: Comment;

  function onMouseEnter() {
    const els = document.querySelectorAll(
      `mark[data-target-id="${comment.targetId}"]`,
    );
    els.forEach((el) => el.setAttribute("data-active", "true"));
  }

  function onMouseLeave() {
    const els = document.querySelectorAll(
      `mark[data-target-id="${comment.targetId}"]`,
    );
    els.forEach((el) => el.removeAttribute("data-active"));
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
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 10px 12px;
    cursor: default;
    transition:
      border-color 0.15s ease-out,
      background 0.15s ease-out;
  }

  .comment-bubble:hover {
    border-color: rgba(86, 156, 214, 0.4);
    background: rgba(86, 156, 214, 0.03);
  }

  .comment-author {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #606060;
  }

  .comment-body {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #b0b0b0;
  }
</style>
