<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Comment } from "$lib/comments";

  export let comment: Comment;

  const dispatch = createEventDispatcher<{ delete: string }>();

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
  <button
    class="comment-dismiss"
    on:click={() => {
      onMouseLeave();
      dispatch("delete", comment.id);
    }}
    aria-label="Dismiss comment"
  >
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    >
      <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
  </button>
  <p class="comment-author">{comment.author}</p>
  <p class="comment-body">{comment.body}</p>
</div>

<style>
  .comment-bubble {
    position: relative;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 10px 12px;
    cursor: default;
    transition:
      border-color 0.15s ease-out,
      background 0.15s ease-out;
  }

  .comment-dismiss {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #444;
    cursor: pointer;
    opacity: 0;
    transition:
      opacity 0.15s ease-out,
      color 0.15s ease-out,
      background 0.15s ease-out;
  }

  .comment-bubble:hover .comment-dismiss {
    opacity: 1;
  }

  .comment-dismiss:hover {
    color: #c0c0c0;
    background: rgba(255, 255, 255, 0.08);
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
