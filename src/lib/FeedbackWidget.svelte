<script lang="ts">
  import type { ProcessorResult, ProcessorComment } from "$lib/pipeline";

  export let name: string = "AI";
  export let loading: boolean = false;
  export let result: ProcessorResult | null = null;
  export let failedComments: ProcessorComment[] = [];
  export let error: string = "";

  let open = false;

  $: hasContent = loading || error || result;

  $: commentCount = result?.comments.length ?? 0;
  $: hasError = !!result?.error || !!error;
</script>

<div class="feedback-widget">
  <button
    class="feedback-toggle"
    class:feedback-toggle-active={open}
    class:feedback-toggle-error={hasError && !loading}
    on:click={() => (open = !open)}
    aria-label="Toggle {name} feedback"
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
    <span class="feedback-toggle-label">{name}</span>
    {#if loading}
      <svg
        class="feedback-spinner"
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="rgba(255,255,255,0.08)"
          stroke-width="2"
        />
        <path
          d="M14 8a6 6 0 0 0-6-6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    {:else if commentCount > 0}
      <span class="feedback-toggle-count">{commentCount}</span>
    {/if}
  </button>
  {#if open && hasContent}
    <div class="feedback-panel">
      <div class="feedback-panel-header">{name}</div>
      <div class="feedback-panel-content">
        {#if loading}
          <div class="feedback-loading">
            <svg
              class="feedback-spinner"
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="rgba(255,255,255,0.08)"
                stroke-width="2"
              />
              <path
                d="M14 8a6 6 0 0 0-6-6"
                stroke="#569cd6"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            Asking AI...
          </div>
        {:else if error}
          <div class="feedback-error">{error}</div>
        {:else if result}
          {#if result.error}
            <div class="feedback-error">{result.error}</div>
          {/if}
          {#if result.evaluation}
            <pre class="feedback-text">{result.evaluation}</pre>
          {/if}
          {#if result.comments.length > 0}
            <div class="feedback-summary">
              {result.comments.length} comment{result.comments.length === 1
                ? ""
                : "s"} applied
            </div>
          {/if}
          {#if failedComments.length > 0}
            <details class="feedback-unmatched">
              <summary class="feedback-unmatched-summary">
                {failedComments.length} unmatched comment{failedComments.length ===
                1
                  ? ""
                  : "s"}
              </summary>
              <div class="feedback-unmatched-list">
                {#each failedComments as comment}
                  <article class="feedback-unmatched-item">
                    <p class="feedback-unmatched-target">
                      {comment.targetText}
                    </p>
                    <p class="feedback-unmatched-body">{comment.body}</p>
                  </article>
                {/each}
              </div>
            </details>
          {/if}
          {#if !result.error && !result.evaluation && result.comments.length === 0}
            <div class="feedback-summary">No issues found.</div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>
