<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let top: number;

  const dispatch = createEventDispatcher<{
    comment: { text: string };
    feedback: void;
    dismiss: void;
    pin: void;
    unpin: void;
  }>();

  let commentText = "";

  function handleSubmit() {
    const text = commentText.trim();
    if (!text) return;
    dispatch("comment", { text });
    commentText = "";
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === "Escape") {
      dispatch("dismiss");
    }
  }

  function handleFocusIn() {
    dispatch("pin");
  }

  function handleFocusOut(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget instanceof Node) {
      if (event.currentTarget.contains(next)) return;
    }
    dispatch("unpin");
  }
</script>

<div
  class="selection-action-menu"
  style="top:{top}px"
  on:focusin={handleFocusIn}
  on:focusout={handleFocusOut}
>
  <form class="selection-action-form" on:submit|preventDefault={handleSubmit}>
    <input
      class="selection-action-input"
      type="text"
      placeholder="Add a comment..."
      bind:value={commentText}
      on:keydown={handleKeydown}
      on:pointerdown={handleFocusIn}
    />
    <button
      class="selection-action-submit"
      type="submit"
      disabled={!commentText.trim()}
      aria-label="Add comment"
      on:pointerdown={handleFocusIn}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </button>
  </form>
  <button
    class="selection-action-feedback"
    on:click={() => dispatch("feedback")}
    on:pointerdown={handleFocusIn}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
    Get AI Feedback
  </button>
</div>
