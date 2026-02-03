<script lang="ts">
  import type { Writable } from "svelte/store";
  import type { ApplyResult, PipelineResult } from "$lib/pipeline";
  import DebugWidget from "$lib/DebugWidget.svelte";
  import FeedbackWidget from "$lib/FeedbackWidget.svelte";

  export let wordCount: number;
  export let feedbackLoading: boolean = false;
  export let pipelineResults: PipelineResult | null = null;
  export let feedbackApplyResult: ApplyResult | null = null;
  export let feedbackError: string = "";
  export let editorStateJson: Writable<string> | null = null;
</script>

<div class="bottom-toolbar" role="toolbar" aria-label="Editor tools">
  <span class="word-count">
    <span class="word-count-number">{wordCount}</span>
    <span class="word-count-label">{wordCount === 1 ? "word" : "words"}</span>
  </span>
  <div class="bottom-toolbar-center">
    <FeedbackWidget
      loading={feedbackLoading}
      results={pipelineResults}
      applyResult={feedbackApplyResult}
      error={feedbackError}
    />
  </div>
  <div class="bottom-toolbar-end">
    {#if editorStateJson}
      <DebugWidget {editorStateJson} />
    {/if}
  </div>
</div>
