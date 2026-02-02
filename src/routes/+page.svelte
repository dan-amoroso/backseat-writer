<script lang="ts">
  import Editor from "$lib/Editor.svelte";
  import CommentBubble from "$lib/CommentBubble.svelte";
  import Sidebar from "$lib/Sidebar.svelte";
  import SettingsModal from "$lib/SettingsModal.svelte";
  import DebugWidget from "$lib/DebugWidget.svelte";
  import { comments } from "$lib/comments";
  import type { Writable } from "svelte/store";
  import { get } from "svelte/store";
  import { settings, setSetting } from "$lib/storage";
  import { chatCompletion } from "$lib/perplexity";
  import { chatCompletion as openAIChatCompletion } from "$lib/openai";

  const writingTypes = ["Blog Post", "Essay"];
  let selectedWritingType = writingTypes[0];

  let editorStateJson: Writable<string>;
  let settingsOpen = false;

  let feedbackOpen = false;
  let feedbackLoading = false;
  let feedbackResponse = "";
  let feedbackError = "";
  let hasFeedback = false;

  function extractTextFromNodes(nodes: any[]): string {
    let text = "";
    for (const node of nodes) {
      if (node.text) {
        text += node.text;
      }
      if (node.children) {
        text += extractTextFromNodes(node.children);
      }
      if (
        node.type === "paragraph" ||
        node.type === "heading" ||
        node.type === "quote"
      ) {
        text += "\n";
      }
    }
    return text;
  }

  async function getFeedback() {
    const current = get(settings);
    const verifiedKeys = current.verifiedKeys || {};
    const openAIKey = verifiedKeys["OpenAI"]
      ? current.apiKeys?.["OpenAI"]
      : undefined;
    const perplexityKey = verifiedKeys["Perplexity"]
      ? current.apiKeys?.["Perplexity"]
      : undefined;
    const provider = openAIKey ? "OpenAI" : perplexityKey ? "Perplexity" : null;
    const key = openAIKey || perplexityKey;
    if (!key) {
      const hasOpenAIKey = !!current.apiKeys?.["OpenAI"];
      const hasPerplexityKey = !!current.apiKeys?.["Perplexity"];
      if (hasOpenAIKey || hasPerplexityKey) {
        feedbackError =
          "One or more API keys are configured but not validated. Please go to Settings and validate your keys.";
      } else {
        feedbackError =
          "Please configure an OpenAI or Perplexity API key in Settings.";
      }
      feedbackResponse = "";
      hasFeedback = true;
      feedbackOpen = true;
      return;
    }

    let editorText = "";
    try {
      const state = JSON.parse(get(editorStateJson));
      editorText = extractTextFromNodes(state.root?.children || []).trim();
    } catch {
      feedbackError = "Could not read editor content.";
      feedbackResponse = "";
      hasFeedback = true;
      feedbackOpen = true;
      return;
    }

    if (!editorText) {
      feedbackError = "The editor is empty. Write something first.";
      feedbackResponse = "";
      hasFeedback = true;
      feedbackOpen = true;
      return;
    }

    feedbackLoading = true;
    feedbackOpen = true;
    hasFeedback = true;
    feedbackResponse = "";
    feedbackError = "";

    try {
      let result;
      if (provider === "OpenAI") {
        result = await openAIChatCompletion(key, {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Comment on the following text, it should be a ${selectedWritingType}:\n\n${editorText}`,
            },
          ],
        });
      } else {
        result = await chatCompletion(key, {
          model: "sonar",
          messages: [
            {
              role: "user",
              content: `Comment on the following text, it should be a ${selectedWritingType}:\n\n${editorText}`,
            },
          ],
        });
      }
      feedbackResponse =
        result.choices?.[0]?.message?.content || "No response received.";
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
          <CommentBubble {comment} />
        {/each}
      </aside>
    </div>
  </main>
</div>

{#if editorStateJson}
  <DebugWidget {editorStateJson} />
{/if}

{#if hasFeedback}
  <div class="feedback-widget">
    <button
      class="feedback-toggle"
      class:feedback-toggle-active={feedbackOpen}
      on:click={() => (feedbackOpen = !feedbackOpen)}
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
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        />
      </svg>
      <span class="feedback-toggle-label">AI</span>
      {#if feedbackLoading}
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
    {#if feedbackOpen}
      <div class="feedback-panel">
        <div class="feedback-panel-header">AI Feedback</div>
        <div class="feedback-panel-content">
          {#if feedbackLoading}
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
          {:else if feedbackError}
            <div class="feedback-error">{feedbackError}</div>
          {:else}
            <pre class="feedback-text">{feedbackResponse}</pre>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

{#if settingsOpen}
  <SettingsModal on:close={() => (settingsOpen = false)} />
{/if}

<style>
  /* ── App shell ── */

  .app-shell {
    display: flex;
    min-height: 100vh;
  }

  main {
    flex: 1;
    min-width: 0;
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #e0e0e0;
    letter-spacing: -0.01em;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #808080;
  }

  select {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: #d4d4d4;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s ease-out;
  }

  select:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  select:focus {
    outline: none;
    border-color: rgba(86, 156, 214, 0.5);
  }

  .workspace {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .editor-pane {
    flex: 1;
    min-width: 0;
  }

  .comments-pane {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* ── Debug widget ── */

  :global(.debug-widget) {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  :global(.debug-toggle) {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(30, 30, 30, 0.9);
    color: #4a4a4a;
    cursor: pointer;
    font-size: 11px;
    font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", monospace;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition:
      color 0.15s ease-out,
      border-color 0.15s ease-out,
      background 0.15s ease-out;
  }

  :global(.debug-toggle:hover) {
    color: #808080;
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(40, 40, 40, 0.95);
  }

  :global(.debug-toggle-active) {
    color: #569cd6;
    border-color: rgba(86, 156, 214, 0.3);
  }

  :global(.debug-toggle-label) {
    line-height: 1;
  }

  :global(.debug-panel) {
    margin-bottom: 8px;
    width: 420px;
    max-width: 90vw;
    max-height: 50vh;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(28, 28, 30, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: debugIn 0.15s ease-out;
  }

  @keyframes debugIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  :global(.debug-panel-header) {
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }

  :global(.debug-panel-content) {
    margin: 0;
    padding: 12px 14px;
    font-size: 11px;
    line-height: 1.5;
    color: #808080;
    overflow: auto;
    flex: 1;
  }

  :global(.debug-panel-content::-webkit-scrollbar) {
    width: 5px;
  }

  :global(.debug-panel-content::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(.debug-panel-content::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
  }

  /* ── Backdrop ── */

  :global(.settings-backdrop) {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn 0.15s ease-out;
  }

  /* ── Modal ── */

  :global(.settings-modal) {
    background: #1c1c1e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    width: 440px;
    max-width: 92vw;
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.03) inset,
      0 1px 0 rgba(255, 255, 255, 0.04) inset;
    animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: scale(0.97) translateY(6px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* ── Modal header ── */

  :global(.settings-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.015);
  }

  :global(.settings-header-left) {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  :global(.settings-header-icon) {
    color: #569cd6;
    opacity: 0.6;
  }

  :global(.settings-header h2) {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: #d4d4d4;
    letter-spacing: 0.01em;
  }

  :global(.settings-close) {
    background: none;
    border: 1px solid transparent;
    color: #555;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      color 0.15s ease-out,
      background 0.15s ease-out;
  }

  :global(.settings-close:hover) {
    color: #aaa;
    background: rgba(255, 255, 255, 0.06);
  }

  :global(.settings-close:focus-visible) {
    outline: none;
    border-color: rgba(86, 156, 214, 0.5);
  }

  /* ── Modal body ── */

  :global(.settings-body) {
    padding: 4px 0;
    max-height: 70vh;
    overflow-y: auto;
  }

  :global(.settings-body::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.settings-body::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(.settings-body::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
  }

  /* ── Sections ── */

  :global(.settings-section) {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 20px 16px;
  }

  :global(.settings-section + .settings-section) {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  :global(.settings-section-title) {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #555;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.section-title-bar) {
    width: 3px;
    height: 10px;
    background: #569cd6;
    border-radius: 2px;
    opacity: 0.5;
  }

  :global(.settings-section-desc) {
    margin: -2px 0 6px;
    font-size: 12px;
    color: #484848;
    line-height: 1.4;
    padding-left: 11px;
  }

  /* ── API key rows ── */

  :global(.api-key-row) {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition:
      border-color 0.2s ease-out,
      background 0.2s ease-out;
  }

  :global(.api-key-row:focus-within) {
    border-color: rgba(86, 156, 214, 0.25);
    background: rgba(86, 156, 214, 0.025);
  }

  :global(.api-key-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  :global(.api-key-name) {
    font-size: 13px;
    font-weight: 500;
    color: #b0b0b0;
  }

  :global(.api-key-status) {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #444;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.03);
    transition:
      color 0.2s ease-out,
      background 0.2s ease-out;
  }

  :global(.api-key-status.api-key-set) {
    color: #4ec9b0;
    background: rgba(78, 201, 176, 0.08);
  }

  :global(.api-key-input-row) {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.api-key-validation-icon) {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.api-key-spinner) {
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  :global(.api-key-input-wrap) {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.15s ease-out;
  }

  :global(.api-key-input-wrap:focus-within) {
    border-color: rgba(86, 156, 214, 0.35);
  }

  :global(.api-key-input) {
    flex: 1;
    min-width: 0;
    padding: 7px 10px;
    border: none;
    background: transparent;
    color: #d4d4d4;
    font-size: 12px;
    font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", monospace;
    letter-spacing: 0.02em;
  }

  :global(.api-key-input::placeholder) {
    color: #363636;
  }

  :global(.api-key-input:focus) {
    outline: none;
  }

  :global(.api-key-validate) {
    background: rgba(86, 156, 214, 0.12);
    border: 1px solid rgba(86, 156, 214, 0.3);
    color: #9cdcfe;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition:
      background 0.15s ease-out,
      border-color 0.15s ease-out;
  }

  :global(.api-key-validate:hover) {
    background: rgba(86, 156, 214, 0.2);
    border-color: rgba(86, 156, 214, 0.45);
  }

  :global(.api-key-validate:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.api-key-toggle) {
    flex-shrink: 0;
    background: none;
    border: none;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    color: #3e3e3e;
    cursor: pointer;
    padding: 7px 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s ease-out;
  }

  :global(.api-key-toggle:hover) {
    color: #808080;
  }

  /* ── Feedback button ── */

  .feedback-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid rgba(86, 156, 214, 0.3);
    background: rgba(86, 156, 214, 0.1);
    color: #9cdcfe;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background 0.15s ease-out,
      border-color 0.15s ease-out;
  }

  .feedback-btn:hover {
    background: rgba(86, 156, 214, 0.2);
    border-color: rgba(86, 156, 214, 0.45);
  }

  .feedback-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  :global(.feedback-spinner) {
    animation: spin 0.7s linear infinite;
  }

  /* ── Feedback widget ── */

  :global(.feedback-widget) {
    position: fixed;
    bottom: 16px;
    left: 80px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  :global(.feedback-toggle) {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(30, 30, 30, 0.9);
    color: #4a4a4a;
    cursor: pointer;
    font-size: 11px;
    font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", monospace;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition:
      color 0.15s ease-out,
      border-color 0.15s ease-out,
      background 0.15s ease-out;
  }

  :global(.feedback-toggle:hover) {
    color: #808080;
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(40, 40, 40, 0.95);
  }

  :global(.feedback-toggle-active) {
    color: #569cd6;
    border-color: rgba(86, 156, 214, 0.3);
  }

  :global(.feedback-toggle-label) {
    line-height: 1;
  }

  :global(.feedback-panel) {
    margin-bottom: 8px;
    width: 480px;
    max-width: 90vw;
    max-height: 50vh;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(28, 28, 30, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: debugIn 0.15s ease-out;
  }

  :global(.feedback-panel-header) {
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }

  :global(.feedback-panel-content) {
    padding: 12px 14px;
    overflow: auto;
    flex: 1;
  }

  :global(.feedback-panel-content::-webkit-scrollbar) {
    width: 5px;
  }

  :global(.feedback-panel-content::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(.feedback-panel-content::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
  }

  :global(.feedback-loading) {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #808080;
  }

  :global(.feedback-error) {
    font-size: 12px;
    color: #a83232;
    line-height: 1.5;
  }

  :global(.feedback-text) {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: #c0c0c0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
</style>
