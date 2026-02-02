<script lang="ts">
  import type { PipelineResult, ApplyResult } from "$lib/pipeline";

  export let loading: boolean = false;
  export let results: PipelineResult | null = null;
  export let applyResult: ApplyResult | null = null;
  export let error: string = "";

  let open = false;

  $: hasContent = loading || error || results;
  $: if (hasContent) open = true;
</script>

<div class="feedback-widget">
  <button
    class="feedback-toggle"
    class:feedback-toggle-active={open}
    on:click={() => (open = !open)}
    aria-label="Toggle AI feedback"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
    <span class="feedback-toggle-label">AI</span>
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
    {/if}
  </button>
  {#if open && hasContent}
    <div class="feedback-panel">
      <div class="feedback-panel-header">AI Feedback</div>
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
        {:else if results}
          {#if applyResult}
            <div class="feedback-summary">
              {applyResult.commentsCreated} comments applied{#if applyResult.commentsFailed > 0},
                {applyResult.commentsFailed} could not be matched to text{/if}
            </div>
          {/if}
          {#each results.results as result}
            <section class="feedback-processor-section">
              <h3 class="feedback-processor-name">{result.processorName}</h3>
              {#if result.error}
                <div class="feedback-error">{result.error}</div>
              {/if}
              {#if result.evaluation}
                <pre class="feedback-text">{result.evaluation}</pre>
              {/if}
            </section>
          {/each}
          {#if results.results.length === 0}
            <div class="feedback-error">
              No processors ran. Configure and validate an API key in Settings.
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>
