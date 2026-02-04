<script lang="ts">
  import "../app.css";
  import { get } from "svelte/store";
  import { onMount } from "svelte";
  import {
    $getRoot as getRoot,
    $createParagraphNode as createParagraphNode,
  } from "lexical";
  import { $removeTargetById as removeTargetById } from "$lib/nodes/TargetNode";
  import Editor from "$lib/Editor.svelte";
  import { editorInstance } from "$lib/editorInstance";
  import FileMenu from "$lib/FileMenu.svelte";
  import CommentBubble from "$lib/CommentBubble.svelte";
  import SelectionActionMenu from "$lib/SelectionActionMenu.svelte";
  import SettingsModal from "$lib/SettingsModal.svelte";
  import BottomToolbar from "$lib/BottomToolbar.svelte";
  import {
    comments,
    addComment,
    removeComment,
    deleteAllComments,
  } from "$lib/comments";
  import type { Comment } from "$lib/comments";
  import type { Writable } from "svelte/store";
  import { settings, setSetting, setApiKey } from "$lib/storage";
  import {
    serializeDocument,
    deserializeDocument,
    saveFile,
    openFile,
  } from "$lib/fileIO";
  import { extractTextFromNodes, runPipeline } from "$lib/pipeline";
  import type {
    PipelineResult,
    ApplyResult,
    ProcessorDefinition,
  } from "$lib/pipeline";
  import {
    processors,
    addProcessor as addNewProcessor,
    updateProcessor,
    removeProcessor,
    toggleProcessor,
  } from "$lib/processors";
  import type { Processor } from "$lib/processors";
  import ProcessorsSidebar from "$lib/ProcessorsSidebar.svelte";
  import ProcessorModal from "$lib/ProcessorModal.svelte";
  import { applyPipelineResults } from "$lib/applyPipelineResults";
  import {
    TOGGLE_TARGET_COMMAND,
    $toggleTarget as toggleTarget,
  } from "$lib/nodes/TargetNode";
  import { browser } from "$app/environment";
  import {
    selectionInfo as selectionInfoStore,
    selectionMenuPinned,
    selectionMenuSuppressed,
  } from "$lib/selectionInfo";

  const writingTypes = ["Blog Post", "Essay"];
  let selectedWritingType = writingTypes[0];

  let editorStateJson: Writable<string>;
  let settingsOpen = false;
  let feedbackLoading = false;
  let feedbackError = "";
  let pipelineResults: PipelineResult | null = null;
  let feedbackApplyResult: ApplyResult | null = null;
  let editorMode: "rich" | "markdown" = "rich";
  let editorComponent: Editor;
  let editingProcessor: Processor | null = null;
  let mobileMenuOpen = false;
  let mobileCommentsOpen = false;
  let mobileCommentTargetIds: string[] = [];
  let shareLabel = "Share";
  let shareDialogOpen = false;
  let shareDialogResolve: ((value: boolean) => void) | null = null;

  function decodeBase64Url(value: string): string | null {
    try {
      const padded = value.replace(/-/g, "+").replace(/_/g, "/");
      const padLength = (4 - (padded.length % 4)) % 4;
      const withPadding = padded + "=".repeat(padLength);
      return atob(withPadding);
    } catch {
      return null;
    }
  }

  function parseJsonParam<T>(value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch {
      const decoded = decodeBase64Url(value);
      if (!decoded) return null;
      try {
        return JSON.parse(decoded) as T;
      } catch {
        return null;
      }
    }
  }

  function parseTextParam(value: string): string {
    const decoded = decodeBase64Url(value);
    return decoded ?? value;
  }

  function encodeBase64Url(value: string): string {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function openShareDialog(): Promise<boolean> {
    shareDialogOpen = true;
    return new Promise((resolve) => {
      shareDialogResolve = resolve;
    });
  }

  function resolveShareDialog(value: boolean) {
    shareDialogOpen = false;
    shareDialogResolve?.(value);
    shareDialogResolve = null;
  }

  function onShareDialogBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      resolveShareDialog(false);
    }
  }

  function onShareDialogKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      resolveShareDialog(false);
    }
  }

  onMount(() => {
    if (!browser) return;
    const params = new URLSearchParams(window.location.search);
    const hasEditorState = params.has("editorState");
    const hasText = params.has("text");
    const hasComments = params.has("comments");
    const hasProcessors = params.has("processors");
    const hasApiKeys =
      params.has("apiKeys") ||
      params.has("openaiKey") ||
      params.has("perplexityKey");

    if (
      !hasEditorState &&
      !hasText &&
      !hasComments &&
      !hasProcessors &&
      !hasApiKeys
    ) {
      return;
    }

    if (hasApiKeys) {
      const apiKeysParam = params.get("apiKeys");
      if (apiKeysParam) {
        const parsed = parseJsonParam<Record<string, string>>(apiKeysParam);
        if (parsed) {
          for (const [provider, value] of Object.entries(parsed)) {
            if (value) {
              setApiKey(provider, value);
            }
          }
        }
      }
      const openaiKey = params.get("openaiKey");
      if (openaiKey) {
        setApiKey("openai", parseTextParam(openaiKey));
      }
      const perplexityKey = params.get("perplexityKey");
      if (perplexityKey) {
        setApiKey("perplexity", parseTextParam(perplexityKey));
      }
    }

    const applyEditorContent = (): boolean => {
      if (hasEditorState) {
        const raw = params.get("editorState");
        if (raw) {
          const parsed = parseJsonParam<Record<string, unknown>>(raw);
          if (parsed) {
            const success = editorComponent?.setEditorStateFromJson(
              JSON.stringify(parsed),
            );
            if (success) return true;
          }
        }
      }
      if (hasText) {
        const text = params.get("text");
        if (text != null) {
          editorComponent?.setPlainTextContent(parseTextParam(text));
          return true;
        }
      }
      return false;
    };

    let editorInitialized = applyEditorContent();
    if (!editorInitialized && (hasEditorState || hasText)) {
      const unsubscribe = editorInstance.subscribe((editor) => {
        if (!editor) return;
        editorInitialized = applyEditorContent();
        unsubscribe();
      });
    }

    if (hasComments) {
      const raw = params.get("comments");
      if (raw) {
        const parsed = parseJsonParam<Comment[]>(raw);
        if (parsed && Array.isArray(parsed)) {
          comments.set(parsed);
        }
      }
    } else if (editorInitialized) {
      deleteAllComments();
    }

    if (hasProcessors) {
      const raw = params.get("processors");
      if (raw) {
        const parsed = parseJsonParam<Processor[]>(raw);
        if (parsed && Array.isArray(parsed)) {
          processors.set(parsed);
        }
      }
    }
  });

  function handleProcessorSelect(event: CustomEvent<Processor>) {
    editingProcessor = event.detail;
  }

  function openProcessor(processor: Processor) {
    editingProcessor = processor;
  }

  function handleProcessorAdd() {
    editingProcessor = addNewProcessor();
  }

  function handleProcessorSave(event: CustomEvent<Processor>) {
    updateProcessor(event.detail);
    editingProcessor = null;
  }

  function handleProcessorDelete(event: CustomEvent<string>) {
    removeProcessor(event.detail);
    editingProcessor = null;
  }

  function processorsToDefinitions(procs: Processor[]): ProcessorDefinition[] {
    return procs
      .filter((p) => p.active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        bindings: [{ provider: p.provider, model: p.model }],
        systemPrompt: p.personality,
        includeEvaluation: p.includeEvaluation,
      }));
  }

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
        processorsToDefinitions(get(processors)),
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

  function undo() {
    editorComponent?.undo();
  }

  function redo() {
    editorComponent?.redo();
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

  async function copyShareLink() {
    try {
      const includeKeysInShare = await openShareDialog();
      const url = new URL(window.location.href);
      const params = new URLSearchParams();
      const editorState =
        editorMode === "markdown"
          ? editorComponent?.getRichEditorStateJson?.() || get(editorStateJson)
          : get(editorStateJson);
      if (editorState && editorState !== "{}") {
        params.set("editorState", encodeBase64Url(editorState));
      }
      const commentList = get(comments);
      if (commentList.length > 0) {
        params.set("comments", encodeBase64Url(JSON.stringify(commentList)));
      }
      const processorList = get(processors);
      if (processorList.length > 0) {
        params.set(
          "processors",
          encodeBase64Url(JSON.stringify(processorList)),
        );
      }
      if (includeKeysInShare) {
        const apiKeys = get(settings).apiKeys || {};
        if (Object.keys(apiKeys).length > 0) {
          params.set("apiKeys", encodeBase64Url(JSON.stringify(apiKeys)));
        }
      }
      url.search = params.toString();
      await navigator.clipboard.writeText(url.toString());
      shareLabel = "Copied!";
      setTimeout(() => (shareLabel = "Share"), 1500);
    } catch {
      // ignore
    }
  }

  function handleFileNew() {
    const editor = get(editorInstance);
    if (!editor) return;
    const stateStr = get(editorStateJson);
    let hasContent = false;
    try {
      const state = JSON.parse(stateStr);
      const text = extractTextFromNodes(state.root?.children || []).trim();
      hasContent = text.length > 0;
    } catch {
      // empty
    }
    if (hasContent && !confirm("Discard current document?")) return;
    editor.update(() => {
      const root = getRoot();
      root.clear();
      root.append(createParagraphNode());
    });
    deleteAllComments();
    selectedWritingType = writingTypes[0];
    setSetting("writingType", writingTypes[0]);
  }

  async function handleFileOpen() {
    try {
      const raw = await openFile();
      const doc = deserializeDocument(raw);
      const editor = get(editorInstance);
      if (!editor) return;
      const parsed = editor.parseEditorState(JSON.stringify(doc.editorState));
      editor.setEditorState(parsed);
      comments.set(doc.comments);
      selectedWritingType = doc.writingType || writingTypes[0];
      setSetting("writingType", selectedWritingType);
    } catch {
      // user cancelled or invalid file
    }
  }

  async function handleFileSave() {
    try {
      const content = serializeDocument(
        get(editorStateJson),
        get(comments),
        selectedWritingType,
      );
      await saveFile(content);
    } catch {
      // user cancelled
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

  function syncCommentMarks() {
    const referencedIds = new Set($comments.map((c) => c.targetId));
    const marks = document.querySelectorAll("mark[data-target-ids]");
    for (const mark of marks) {
      const idsAttr = mark.getAttribute("data-target-ids") || "";
      const ids = idsAttr.split(",").filter(Boolean);
      if (ids.some((id) => referencedIds.has(id))) {
        mark.setAttribute("data-has-comments", "true");
      } else {
        mark.removeAttribute("data-has-comments");
      }
    }
  }

  $: if (browser && $comments) {
    requestAnimationFrame(() => syncCommentMarks());
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
      const mark = findMarkByTargetId(comment.targetId);
      let idealTop = 0;
      if (mark) {
        const markRect = mark.getBoundingClientRect();
        idealTop = markRect.top - paneRect.top;
      }
      const top = Math.max(idealTop, nextAvailable);
      offsets[comment.id] = top;
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

  function findMarkByTargetId(targetId: string): Element | null {
    const marks = document.querySelectorAll("mark[data-target-ids]");
    for (const mark of marks) {
      const ids = (mark.getAttribute("data-target-ids") || "").split(",");
      if (ids.includes(targetId)) {
        return mark;
      }
    }
    return null;
  }

  $: if (browser && $comments && workspaceEl) {
    requestAnimationFrame(() => computeCommentOffsets());
  }

  // Selection action menu
  let selectionMenuTop: number | null = null;
  let selectionMenuText = "";

  $: if ($selectionInfoStore && workspaceEl) {
    const info = $selectionInfoStore;
    const paneRect = workspaceEl.getBoundingClientRect();
    selectionMenuTop = info.anchorRect.top - paneRect.top;
    selectionMenuText = info.text;
  } else {
    selectionMenuTop = null;
    selectionMenuText = "";
  }

  function clearSelectionMenu() {
    selectionInfoStore.set(null);
    selectionMenuPinned.set(false);
    selectionMenuSuppressed.set(true);
    if (browser) {
      window.getSelection()?.removeAllRanges();
    }
  }

  function handleSelectionComment(event: CustomEvent<{ text: string }>) {
    const editor = get(editorInstance);
    if (!editor) return;

    const targetId = crypto.randomUUID();
    editor.update(() => {
      toggleTarget(targetId);
    });

    addComment(targetId, "You", event.detail.text);

    clearSelectionMenu();
  }

  function clearActiveTargets() {
    const marks = document.querySelectorAll("mark[data-target-ids]");
    for (const mark of marks) {
      mark.removeAttribute("data-active");
    }
  }

  function handleDeleteComment(id: string) {
    clearActiveTargets();
    const comment = get(comments).find((c) => c.id === id);
    removeComment(id);
    if (comment) {
      const editor = get(editorInstance);
      if (editor) {
        const remainingTargetIds = new Set(
          get(comments).map((c) => c.targetId),
        );
        if (!remainingTargetIds.has(comment.targetId)) {
          editor.update(() => {
            removeTargetById(comment.targetId);
          });
        }
      }
    }
  }

  function handleSelectionFeedback() {
    const editor = get(editorInstance);
    if (!editor || !selectionMenuText) return;

    const targetId = crypto.randomUUID();
    editor.dispatchCommand(TOGGLE_TARGET_COMMAND, targetId);

    addComment(
      targetId,
      "You",
      `[Feedback requested on: "${selectionMenuText.slice(0, 80)}${selectionMenuText.length > 80 ? "..." : ""}"]`,
    );

    clearSelectionMenu();
  }

  function handleSelectionDismiss() {
    clearSelectionMenu();
  }

  function isMobileViewport(): boolean {
    return browser && window.matchMedia("(max-width: 768px)").matches;
  }

  function setActiveTargets(targetIds: string[]) {
    const marks = document.querySelectorAll("mark[data-target-ids]");
    for (const mark of marks) {
      const ids = (mark.getAttribute("data-target-ids") || "").split(",");
      if (ids.some((id) => targetIds.includes(id))) {
        mark.setAttribute("data-active", "true");
      }
    }
  }

  function closeMobileComments() {
    mobileCommentsOpen = false;
    mobileCommentTargetIds = [];
    clearActiveTargets();
  }

  function handleEditorClick(event: MouseEvent) {
    if (!isMobileViewport()) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const mark = target.closest("mark[data-target-ids]");
    if (!mark) return;
    const ids = (mark.getAttribute("data-target-ids") || "")
      .split(",")
      .filter(Boolean);
    const availableComments = get(comments).filter((comment) =>
      ids.includes(comment.targetId),
    );
    if (availableComments.length === 0) return;
    clearActiveTargets();
    setActiveTargets(ids);
    mobileCommentTargetIds = ids;
    mobileCommentsOpen = true;
  }

  $: if (mobileCommentsOpen && mobileCommentTargetIds.length) {
    const remaining = $comments.filter((comment) =>
      mobileCommentTargetIds.includes(comment.targetId),
    );
    if (remaining.length === 0) {
      closeMobileComments();
    }
  }
</script>

<main>
  <ProcessorsSidebar
    processors={$processors}
    on:select={handleProcessorSelect}
    on:toggle={(e) => toggleProcessor(e.detail)}
    on:add={handleProcessorAdd}
  />
  <div class="workspace">
    <header class="header">
      <button
        class="mobile-menu-btn"
        on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
        aria-label="Menu"
        aria-expanded={mobileMenuOpen}
        type="button"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div class="header-left">
        <FileMenu
          on:new={handleFileNew}
          on:open={handleFileOpen}
          on:save={handleFileSave}
        />
        <div class="undo-redo-group" role="group" aria-label="Undo and redo">
          <button
            class="undo-btn"
            on:click={() => undo()}
            aria-label="Undo"
            type="button"
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
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            class="redo-btn"
            on:click={() => redo()}
            aria-label="Redo"
            type="button"
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
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
            </svg>
          </button>
        </div>
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
        <button class="share-btn" on:click={copyShareLink}>
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
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
            <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
          </svg>
          {shareLabel}
        </button>
      </div>
      <div class="header-center">
        <div class="mode-toggle" role="group" aria-label="Editor mode">
          <button
            class="mode-toggle-button"
            class:mode-toggle-button-active={editorMode === "rich"}
            aria-pressed={editorMode === "rich"}
            on:click={() => (editorMode = "rich")}
            type="button"
          >
            Rich
          </button>
          <button
            class="mode-toggle-button"
            class:mode-toggle-button-active={editorMode === "markdown"}
            aria-pressed={editorMode === "markdown"}
            on:click={() => (editorMode = "markdown")}
            type="button"
          >
            Markdown
          </button>
        </div>
      </div>
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
    {#if mobileMenuOpen}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div
        class="mobile-menu-backdrop"
        on:click={() => (mobileMenuOpen = false)}
      >
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <aside class="mobile-menu" on:click|stopPropagation>
          <div class="mobile-menu-header">
            <div class="mobile-menu-title">Menu</div>
            <button
              class="mobile-menu-close"
              on:click={() => (mobileMenuOpen = false)}
              aria-label="Close menu"
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
          <section class="mobile-menu-section">
            <h2 class="mobile-menu-section-title">File</h2>
            <button
              class="mobile-menu-item"
              on:click={() => {
                handleFileNew();
                mobileMenuOpen = false;
              }}
              type="button"
            >
              New
            </button>
            <button
              class="mobile-menu-item"
              on:click={() => {
                handleFileOpen();
                mobileMenuOpen = false;
              }}
              type="button"
            >
              Open
            </button>
            <button
              class="mobile-menu-item"
              on:click={() => {
                handleFileSave();
                mobileMenuOpen = false;
              }}
              type="button"
            >
              Save
            </button>
          </section>
          <section class="mobile-menu-section">
            <h2 class="mobile-menu-section-title">Edit</h2>
            <button
              class="mobile-menu-item"
              on:click={() => {
                undo();
                mobileMenuOpen = false;
              }}
              type="button"
            >
              Undo
            </button>
            <button
              class="mobile-menu-item"
              on:click={() => {
                redo();
                mobileMenuOpen = false;
              }}
              type="button"
            >
              Redo
            </button>
            <button
              class="mobile-menu-item"
              on:click={() => {
                copyToClipboard();
                mobileMenuOpen = false;
              }}
              type="button"
            >
              Copy
            </button>
            <button
              class="mobile-menu-item"
              on:click={() => {
                copyShareLink();
                mobileMenuOpen = false;
              }}
              type="button"
            >
              Share
            </button>
          </section>
          <section class="mobile-menu-section">
            <h2 class="mobile-menu-section-title">Mode</h2>
            <div class="mobile-menu-toggle-group" role="group">
              <button
                class="mobile-menu-toggle"
                class:mobile-menu-toggle-active={editorMode === "rich"}
                aria-pressed={editorMode === "rich"}
                on:click={() => {
                  editorMode = "rich";
                  mobileMenuOpen = false;
                }}
                type="button"
              >
                Rich
              </button>
              <button
                class="mobile-menu-toggle"
                class:mobile-menu-toggle-active={editorMode === "markdown"}
                aria-pressed={editorMode === "markdown"}
                on:click={() => {
                  editorMode = "markdown";
                  mobileMenuOpen = false;
                }}
                type="button"
              >
                Markdown
              </button>
            </div>
          </section>
          <section class="mobile-menu-section">
            <h2 class="mobile-menu-section-title">Writing Type</h2>
            <label class="mobile-menu-label">
              <span>What are we writing?</span>
              <select
                bind:value={selectedWritingType}
                on:change={(event) => {
                  onWritingTypeChange(event);
                  mobileMenuOpen = false;
                }}
              >
                {#each writingTypes as wt}
                  <option>{wt}</option>
                {/each}
              </select>
            </label>
          </section>
          <section class="mobile-menu-section">
            <div class="mobile-menu-section-header">
              <h2 class="mobile-menu-section-title">Processors</h2>
              <button
                class="mobile-menu-item mobile-menu-item-compact"
                on:click={() => {
                  handleProcessorAdd();
                  mobileMenuOpen = false;
                }}
                type="button"
              >
                Add
              </button>
            </div>
            <div class="mobile-menu-processors">
              {#each $processors as processor (processor.id)}
                <div class="mobile-menu-processor">
                  <button
                    class="mobile-menu-processor-info"
                    on:click={() => {
                      openProcessor(processor);
                      mobileMenuOpen = false;
                    }}
                    type="button"
                  >
                    <span class="mobile-menu-processor-name"
                      >{processor.name}</span
                    >
                    <span class="mobile-menu-processor-meta"
                      >{processor.provider} · {processor.model}</span
                    >
                  </button>
                  <button
                    class="mobile-menu-processor-toggle"
                    class:mobile-menu-processor-toggle-active={processor.active}
                    on:click={() => {
                      toggleProcessor(processor.id);
                      mobileMenuOpen = false;
                    }}
                    role="switch"
                    aria-checked={processor.active}
                    aria-label="Toggle {processor.name}"
                    type="button"
                  >
                    <span class="mobile-menu-processor-thumb"></span>
                  </button>
                </div>
              {/each}
            </div>
          </section>
          <section class="mobile-menu-section">
            <h2 class="mobile-menu-section-title">Other</h2>
            <button
              class="mobile-menu-item"
              on:click={() => {
                settingsOpen = true;
                mobileMenuOpen = false;
              }}
              type="button"
            >
              Settings
            </button>
            <div class="mobile-menu-word-count">
              <div class="word-count-number">{wordCount}</div>
              <div class="word-count-label">words</div>
            </div>
          </section>
        </aside>
      </div>
    {/if}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div
      class="editor-content"
      bind:this={workspaceEl}
      on:click={handleEditorClick}
    >
      <div class="editor-pane">
        <Editor
          bind:this={editorComponent}
          bind:editorStateJson
          mode={editorMode}
        />
      </div>
      <aside class="comments-pane">
        {#if selectionMenuTop != null && selectionMenuText}
          <SelectionActionMenu
            top={selectionMenuTop}
            on:comment={handleSelectionComment}
            on:feedback={handleSelectionFeedback}
            on:dismiss={handleSelectionDismiss}
            on:pin={() => selectionMenuPinned.set(true)}
            on:unpin={() => selectionMenuPinned.set(false)}
          />
        {/if}
        {#each $comments as comment (comment.id)}
          <div
            data-comment-id={comment.id}
            class="comment-positioned"
            style={commentOffsets[comment.id] != null
              ? `top:${commentOffsets[comment.id]}px`
              : ""}
          >
            <CommentBubble
              {comment}
              on:delete={(e) => handleDeleteComment(e.detail)}
            />
          </div>
        {/each}
      </aside>
    </div>
    {#if mobileCommentsOpen}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div class="mobile-comments-backdrop" on:click={closeMobileComments}>
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <aside class="mobile-comments-panel" on:click|stopPropagation>
          <div class="mobile-comments-header">
            <div class="mobile-comments-title">Comments</div>
            <button
              class="mobile-comments-close"
              on:click={closeMobileComments}
              aria-label="Close comments"
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
          <div class="mobile-comments-list">
            {#each $comments.filter( (comment) => mobileCommentTargetIds.includes(comment.targetId), ) as comment (comment.id)}
              <CommentBubble
                {comment}
                on:delete={(e) => handleDeleteComment(e.detail)}
              />
            {/each}
          </div>
        </aside>
      </div>
    {/if}
    <BottomToolbar
      {wordCount}
      processors={$processors}
      {feedbackLoading}
      {pipelineResults}
      {feedbackApplyResult}
      {feedbackError}
      {editorStateJson}
    />
  </div>
</main>

{#if settingsOpen}
  <SettingsModal on:close={() => (settingsOpen = false)} />
{/if}

{#if editingProcessor}
  <ProcessorModal
    processor={editingProcessor}
    on:save={handleProcessorSave}
    on:delete={handleProcessorDelete}
    on:close={() => (editingProcessor = null)}
  />
{/if}

{#if shareDialogOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="settings-backdrop"
    on:click={onShareDialogBackdropClick}
    on:keydown={onShareDialogKeydown}
  >
    <div class="share-dialog" role="dialog" aria-label="Share link">
      <div class="share-dialog-header">
        <div class="share-dialog-title">Share Link</div>
        <button
          class="share-dialog-close"
          on:click={() => resolveShareDialog(false)}
          aria-label="Close"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          >
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>
      <div class="share-dialog-body">
        <p class="share-dialog-text">Include API keys in the share link?</p>
        <p class="share-dialog-subtext">
          Anyone with the link can see the keys.
        </p>
      </div>
      <footer class="share-dialog-footer">
        <button
          class="share-dialog-cancel"
          on:click={() => resolveShareDialog(false)}
          type="button"
        >
          No, exclude keys
        </button>
        <button
          class="share-dialog-confirm"
          on:click={() => resolveShareDialog(true)}
          type="button"
        >
          Yes, include keys
        </button>
      </footer>
    </div>
  </div>
{/if}
