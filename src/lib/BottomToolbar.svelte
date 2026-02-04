<script lang="ts">
  import type { Writable } from "svelte/store";
  import type {
    ApplyResult,
    PipelineResult,
    ProcessorComment,
  } from "$lib/pipeline";
  import type { Processor } from "$lib/processors";
  import DebugWidget from "$lib/DebugWidget.svelte";
  import FeedbackWidget from "$lib/FeedbackWidget.svelte";
  import { settings } from "$lib/storage";

  export let wordCount: number;
  export let processors: Processor[] = [];
  export let feedbackLoading: boolean = false;
  export let pipelineResults: PipelineResult | null = null;
  export let feedbackApplyResult: ApplyResult | null = null;
  export let feedbackError: string = "";
  export let editorStateJson: Writable<string> | null = null;
  let configuredProcessors: Processor[] = [];

  $: configuredProcessors = processors.filter((processor) => {
    if (!processor.active) return false;
    const apiKeys = $settings?.apiKeys ?? {};
    const key = apiKeys[processor.provider];
    return typeof key === "string" && key.trim().length > 0;
  });

  function getResultForProcessor(id: string) {
    return pipelineResults?.results.find((r) => r.processorId === id) ?? null;
  }

  function getFailedCommentsForProcessor(id: string): ProcessorComment[] {
    if (!feedbackApplyResult) return [];
    const result = getResultForProcessor(id);
    if (!result) return [];
    const authorName = result.processorName;
    return feedbackApplyResult.failedComments.filter(
      (c) => c.author === authorName,
    );
  }
</script>

<div class="bottom-toolbar" role="toolbar" aria-label="Editor tools">
  <span class="word-count">
    <span class="word-count-number">{wordCount}</span>
    <span class="word-count-label">{wordCount === 1 ? "word" : "words"}</span>
  </span>
  <div class="bottom-toolbar-center">
    {#each configuredProcessors as processor (processor.id)}
      <FeedbackWidget
        name={processor.name}
        loading={feedbackLoading}
        result={getResultForProcessor(processor.id)}
        failedComments={getFailedCommentsForProcessor(processor.id)}
        error={feedbackError}
      />
    {/each}
  </div>
  <div class="bottom-toolbar-end">
    <a class="about-link" href="/about">About</a>
    <a
      class="github-link"
      href="https://github.com/dan-amoroso/backseat-writer"
      target="_blank"
      rel="noreferrer"
    >
      GitHub
    </a>
    {#if editorStateJson}
      <DebugWidget {editorStateJson} />
    {/if}
  </div>
</div>
