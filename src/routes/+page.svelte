<script lang="ts">
  import "../app.css";
  import { get } from "svelte/store";
  import Editor from "$lib/Editor.svelte";
  import { editorInstance } from "$lib/editorInstance";
  import CommentBubble from "$lib/CommentBubble.svelte";
  import Sidebar from "$lib/Sidebar.svelte";
  import SettingsModal from "$lib/SettingsModal.svelte";
  import DebugWidget from "$lib/DebugWidget.svelte";
  import FeedbackWidget from "$lib/FeedbackWidget.svelte";
  import { comments, removeComment, deleteAllComments } from "$lib/comments";
  import type { Writable } from "svelte/store";
  import { settings, setSetting } from "$lib/storage";
  import { extractTextFromNodes, runPipeline } from "$lib/pipeline";
  import type { PipelineResult, ApplyResult } from "$lib/pipeline";
  import { applyPipelineResults } from "$lib/applyPipelineResults";

  const writingTypes = ["Blog Post", "Essay"];
  let selectedWritingType = writingTypes[0];

  let editorStateJson: Writable<string>;
  let settingsOpen = false;
  let feedbackLoading = false;
  let feedbackError = "";
  let pipelineResults: PipelineResult | null = null;
  let feedbackApplyResult: ApplyResult | null = null;

  async function getFeedback() {
    feedbackLoading = true;
    feedbackError = "";
    pipelineResults = null;
    feedbackApplyResult = null;

    const current = get(settings);
    const verifiedKeys = current.verifiedKeys || {};
    const apiKeys = current.apiKeys || {};

    let editorText = "";
    try {
      const state = JSON.parse(get(editorStateJson));
      editorText = extractTextFromNodes(state.root?.children || []).trim();
    } catch {
      feedbackError = "Could not read editor content.";
      feedbackLoading = false;
      return;
    }

    if (!editorText) {
      feedbackError = "The editor is empty. Write something first.";
      feedbackLoading = false;
      return;
    }

    deleteAllComments();

    try {
      const result = await runPipeline(
        editorText,
        selectedWritingType,
        apiKeys,
        verifiedKeys,
      );
      pipelineResults = result;

      const editor = get(editorInstance);
      if (editor) {
        feedbackApplyResult = applyPipelineResults(editor, result);
      }
    } catch (err) {
      feedbackError =
        err instanceof Error ? err.message : "Failed to get feedback.";
    } finally {
      feedbackLoading = false;
    }
  }

  function onWritingTypeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    setSetting("writingType", select.value);
  }

  let copyLabel = "Copy";

  async function copyToClipboard() {
    try {
      const state = JSON.parse(get(editorStateJson));
      const text = extractTextFromNodes(state.root?.children || []).trim();
      if (!text) return;
      await navigator.clipboard.writeText(text);
      copyLabel = "Copied!";
      setTimeout(() => (copyLabel = "Copy"), 1500);
    } catch {
      // ignore
    }
  }

  let wordCount = 0;

  $: if (editorStateJson && $editorStateJson) {
    try {
      const state = JSON.parse($editorStateJson);
      const text = extractTextFromNodes(state.root?.children || []).trim();
      wordCount = text ? text.split(/\s+/).length : 0;
    } catch {
      wordCount = 0;
    }
  }

  $: if ($settings) {
    selectedWritingType = $settings.writingType || writingTypes[0];
  }
</script>

<div class="app-shell">
  <Sidebar
    settingsActive={settingsOpen}
    on:settings={() => (settingsOpen = true)}
  />
  <main>
    <div class="header">
      <h1>Backseat Writer</h1>
      <div class="header-controls">
        <label>
          What are we writing?
          <select
            bind:value={selectedWritingType}
            on:change={onWritingTypeChange}
          >
            {#each writingTypes as wt}
              <option>{wt}</option>
            {/each}
          </select>
        </label>
        <span class="word-count"
          >{wordCount} {wordCount === 1 ? "word" : "words"}</span
        >
        <button class="copy-btn" on:click={copyToClipboard}>
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
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copyLabel}
        </button>
        <button
          class="feedback-btn"
          on:click={getFeedback}
          disabled={feedbackLoading}
        >
          {#if feedbackLoading}
            <svg
              class="feedback-spinner"
              width="14"
              height="14"
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
          Get Feedback
        </button>
      </div>
    </div>
    <div class="workspace">
      <div class="editor-pane">
        <Editor bind:editorStateJson />
      </div>
      <aside class="comments-pane">
        {#each $comments as comment (comment.id)}
          <CommentBubble {comment} on:delete={(e) => removeComment(e.detail)} />
        {/each}
      </aside>
    </div>
  </main>
</div>

{#if editorStateJson}
  <DebugWidget {editorStateJson} />
{/if}

<FeedbackWidget
  loading={feedbackLoading}
  results={pipelineResults}
  applyResult={feedbackApplyResult}
  error={feedbackError}
/>

{#if settingsOpen}
  <SettingsModal on:close={() => (settingsOpen = false)} />
{/if}
