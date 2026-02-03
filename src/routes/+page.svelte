<script lang="ts">
  import "../app.css";
  import { get } from "svelte/store";
  import Editor from "$lib/Editor.svelte";
  import { editorInstance } from "$lib/editorInstance";
  import CommentBubble from "$lib/CommentBubble.svelte";
  import SettingsModal from "$lib/SettingsModal.svelte";
  import DebugWidget from "$lib/DebugWidget.svelte";
  import FeedbackWidget from "$lib/FeedbackWidget.svelte";
  import { comments, removeComment, deleteAllComments } from "$lib/comments";
  import type { Writable } from "svelte/store";
  import { settings, setSetting } from "$lib/storage";
  import { extractTextFromNodes, runPipeline } from "$lib/pipeline";
  import type { PipelineResult, ApplyResult } from "$lib/pipeline";
  import { applyPipelineResults } from "$lib/applyPipelineResults";
  import { browser } from "$app/environment";

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

  $: if (browser && $comments) {
    const referencedIds = new Set($comments.map((c) => c.targetId));
    const marks = document.querySelectorAll("mark[data-target-id]");
    for (const mark of marks) {
      const id = mark.getAttribute("data-target-id");
      if (id && referencedIds.has(id)) {
        mark.setAttribute("data-has-comments", "true");
      } else {
        mark.removeAttribute("data-has-comments");
      }
    }
  }

  let commentOffsets: Record<string, number> = {};
  let workspaceEl: HTMLElement;

  function computeCommentOffsets() {
    if (!browser || !workspaceEl) return;
    const paneRect = workspaceEl.getBoundingClientRect();
    const GAP = 8;
    let nextAvailable = 0;
    const offsets: Record<string, number> = {};

    for (const comment of $comments) {
      const mark = document.querySelector(
        `mark[data-target-id="${comment.targetId}"]`,
      );
      let idealTop = 0;
      if (mark) {
        const markRect = mark.getBoundingClientRect();
        idealTop = markRect.top - paneRect.top;
      }
      const top = Math.max(idealTop, nextAvailable);
      offsets[comment.id] = top;
      // Estimate bubble height; will be corrected on next tick via ResizeObserver if needed
      const bubbleEl = workspaceEl.querySelector(
        `[data-comment-id="${comment.id}"]`,
      );
      const bubbleHeight = bubbleEl
        ? bubbleEl.getBoundingClientRect().height
        : 60;
      nextAvailable = top + bubbleHeight + GAP;
    }
    commentOffsets = offsets;
  }

  $: if (browser && $comments && workspaceEl) {
    // Recompute after a tick so DOM is updated
    requestAnimationFrame(() => computeCommentOffsets());
  }
</script>

<main>
  <header class="header">
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
      <button
        class="settings-btn"
        on:click={() => (settingsOpen = true)}
        aria-label="Settings"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  </header>
  <div class="workspace" bind:this={workspaceEl}>
    <div class="editor-pane">
      <Editor bind:editorStateJson />
    </div>
    <aside class="comments-pane">
      {#each $comments as comment (comment.id)}
        <div
          data-comment-id={comment.id}
          class="comment-positioned"
          style={commentOffsets[comment.id] != null
            ? `top:${commentOffsets[comment.id]}px`
            : ""}
        >
          <CommentBubble {comment} on:delete={(e) => removeComment(e.detail)} />
        </div>
      {/each}
    </aside>
  </div>
</main>

<FeedbackWidget
  loading={feedbackLoading}
  results={pipelineResults}
  applyResult={feedbackApplyResult}
  error={feedbackError}
/>

{#if editorStateJson}
  <DebugWidget {editorStateJson} />
{/if}

{#if settingsOpen}
  <SettingsModal on:close={() => (settingsOpen = false)} />
{/if}
