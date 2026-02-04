<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    createEditor,
    $createTextNode as createTextNode,
    $createParagraphNode as createParagraphNode,
    $getRoot as getRoot,
    $getSelection as getSelection,
    $isRangeSelection as isRangeSelection,
    KEY_DOWN_COMMAND,
    COMMAND_PRIORITY_LOW,
    COMMAND_PRIORITY_NORMAL,
    UNDO_COMMAND,
    REDO_COMMAND,
    type EditorState,
  } from "lexical";
  import { registerRichText, HeadingNode, QuoteNode } from "@lexical/rich-text";
  import { createEmptyHistoryState, registerHistory } from "@lexical/history";
  import {
    mergeRegister,
    $findMatchingParent as findMatchingParent,
  } from "@lexical/utils";
  import {
    registerMarkdownShortcuts,
    TRANSFORMERS,
    $convertToMarkdownString as convertToMarkdownString,
    $convertFromMarkdownString as convertFromMarkdownString,
  } from "@lexical/markdown";
  import { ListNode, ListItemNode } from "@lexical/list";
  import { LinkNode } from "@lexical/link";
  import { CodeNode, CodeHighlightNode } from "@lexical/code";
  import {
    TargetNode,
    $isTargetNode as isTargetNode,
    $toggleTarget as toggleTarget,
    $removeTargetById as removeTargetById,
    TOGGLE_TARGET_COMMAND,
    createTarget,
  } from "$lib/nodes/TargetNode";
  import { comments } from "$lib/comments";
  import editorThemeClasses from "$lib/editorThemeClasses";
  import { get, writable } from "svelte/store";
  import { loadJson, removeStorageKey, saveJson } from "$lib/storage";
  import { editorInstance } from "$lib/editorInstance";
  import DragHandle from "$lib/DragHandle.svelte";
  import {
    selectionInfo,
    selectionMenuPinned,
    selectionMenuSuppressed,
  } from "$lib/selectionInfo";

  const STORAGE_KEY = "editor-state";
  const STORAGE_MARKDOWN_KEY = "editor-markdown";

  const allTransformers = [...TRANSFORMERS];

  export const editorStateJson = writable<string>("{}");

  let editorRef: HTMLDivElement;
  let editor: ReturnType<typeof createEditor> | null = null;
  let cleanup: (() => void) | undefined;
  let markdownShortcutsCleanup: (() => void) | null = null;
  let lastRichStateJson = "{}";
  let reconcileQueued = false;

  export function undo() {
    editor?.dispatchCommand(UNDO_COMMAND, undefined);
  }

  export function redo() {
    editor?.dispatchCommand(REDO_COMMAND, undefined);
  }

  export function setPlainTextContent(text: string) {
    applyPlainTextToEditor(text);
  }

  export function setEditorStateFromJson(json: string): boolean {
    if (!editor) return false;
    try {
      const parsed = editor.parseEditorState(json);
      editor.setEditorState(parsed);
      const pretty = JSON.stringify(JSON.parse(json), null, 2);
      editorStateJson.set(pretty);
      lastRichStateJson = pretty;
      return true;
    } catch {
      return false;
    }
  }

  export function getRichEditorStateJson(): string {
    return lastRichStateJson;
  }

  function getMarkdownFromEditor() {
    if (!editor) return "";
    return editor
      .getEditorState()
      .read(() => convertToMarkdownString(allTransformers));
  }

  function applyPlainTextToEditor(text: string) {
    if (!editor) return;
    editor.update(() => {
      const root = getRoot();
      root.clear();
      const lines = text.split("\n");
      for (const line of lines) {
        const paragraph = createParagraphNode();
        if (line.length > 0) {
          paragraph.append(createTextNode(line));
        }
        root.append(paragraph);
      }
    });
  }

  function ensureEditorRootNotEmpty() {
    if (!editor) return;
    editor.update(() => {
      const root = getRoot();
      if (root.getChildrenSize() === 0) {
        root.append(createParagraphNode());
      }
    });
  }

  function applyMarkdownToEditor(markdown: string) {
    if (!editor) return;
    editor.update(() => {
      const root = getRoot();
      root.clear();
      const trimmed = markdown.trim();
      if (trimmed.length > 0) {
        convertFromMarkdownString(trimmed, allTransformers, root);
      }
      if (root.getChildrenSize() === 0) {
        root.append(createParagraphNode());
      }
    });
  }

  function queueReconcileComments() {
    if (!editor) return;
    if (reconcileQueued) return;
    reconcileQueued = true;
    requestAnimationFrame(() => {
      reconcileQueued = false;
      reconcileCommentTargets();
    });
  }

  function reconcileCommentTargets() {
    if (!editor) return;
    const currentComments = get(comments);
    if (currentComments.length === 0) return;
    const idsToRemove: string[] = [];
    const updatedTargetText = new Map<string, string>();

    editor.update(() => {
      const targetTextById = new Map<string, string>();
      const root = getRoot();
      const walk = (node: import("lexical").LexicalNode) => {
        if (isTargetNode(node)) {
          const text = node.getTextContent();
          for (const id of node.getTargetIds()) {
            targetTextById.set(id, text);
          }
        }
        if ("getChildren" in node && typeof node.getChildren === "function") {
          (node.getChildren() as import("lexical").LexicalNode[]).forEach(walk);
        }
      };
      walk(root);

      for (const comment of currentComments) {
        const existingText = targetTextById.get(comment.targetId);
        if (existingText) {
          if (!comment.targetText) {
            updatedTargetText.set(comment.id, existingText);
          }
          continue;
        }

        const fallbackText = comment.targetText?.trim();
        if (!fallbackText) {
          idsToRemove.push(comment.id);
          continue;
        }
        const created = createTarget(fallbackText, comment.targetId);
        if (!created) {
          idsToRemove.push(comment.id);
        }
      }
    });

    if (idsToRemove.length === 0 && updatedTargetText.size === 0) {
      return;
    }

    comments.update((list) => {
      const filtered = list.filter((c) => !idsToRemove.includes(c.id));
      if (updatedTargetText.size === 0) {
        return filtered;
      }
      return filtered.map((comment) => {
        const nextText = updatedTargetText.get(comment.id);
        if (!nextText) return comment;
        return { ...comment, targetText: nextText };
      });
    });
  }

  onMount(() => {
    editor = createEditor({
      namespace: "BackseatWriter",
      theme: editorThemeClasses,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        CodeNode,
        CodeHighlightNode,
        TargetNode,
      ],
      onError: (error: Error) => console.error(error),
    });

    editorInstance.set(editor);
    editor.setRootElement(editorRef);

    cleanup = mergeRegister(
      registerRichText(editor),
      registerHistory(editor, createEmptyHistoryState(), 300),
      editor.registerCommand(
        TOGGLE_TARGET_COMMAND,
        (targetId) => {
          toggleTarget(targetId);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event: KeyboardEvent) => {
          if (
            event.key === "h" &&
            event.shiftKey &&
            (event.metaKey || event.ctrlKey)
          ) {
            event.preventDefault();
            const selection = getSelection();
            if (isRangeSelection(selection)) {
              const node = selection.anchor.getNode();
              const targetParent = findMatchingParent(node, isTargetNode);
              if (targetParent) {
                editor!.dispatchCommand(TOGGLE_TARGET_COMMAND, null);
              } else {
                editor!.dispatchCommand(
                  TOGGLE_TARGET_COMMAND,
                  crypto.randomUUID(),
                );
              }
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerUpdateListener(
        ({ editorState }: { editorState: EditorState }) => {
          const json = editorState.toJSON();
          saveJson(STORAGE_KEY, json);
          const pretty = JSON.stringify(json, null, 2);
          editorStateJson.set(pretty);
          lastRichStateJson = pretty;

          // Track selection for the action menu
          editorState.read(() => {
            if (get(selectionMenuSuppressed) || !editorRef) {
              return;
            }
            const selection = getSelection();
            if (
              isRangeSelection(selection) &&
              !selection.isCollapsed() &&
              selection.getTextContent().trim().length > 0
            ) {
              const nativeSelection = window.getSelection();
              if (nativeSelection && nativeSelection.rangeCount > 0) {
                const range = nativeSelection.getRangeAt(0);
                if (!editorRef.contains(range.commonAncestorContainer)) {
                  return;
                }
                const rect = range.getBoundingClientRect();
                selectionInfo.set({
                  text: selection.getTextContent(),
                  anchorRect: rect,
                });
              } else {
                if (!get(selectionMenuPinned)) {
                  selectionInfo.set(null);
                }
              }
            } else {
              if (!get(selectionMenuPinned)) {
                selectionInfo.set(null);
              }
            }
          });
          queueReconcileComments();
        },
      ),
    );

    const pendingMarkdown = loadJson<string | null>(STORAGE_MARKDOWN_KEY, null);
    if (pendingMarkdown && pendingMarkdown.trim().length > 0) {
      applyMarkdownToEditor(pendingMarkdown);
      removeStorageKey(STORAGE_MARKDOWN_KEY);
    } else {
      const saved = loadJson<Record<string, unknown> | null>(STORAGE_KEY, null);
      if (saved) {
        try {
          const parsed = editor.parseEditorState(JSON.stringify(saved));
          const isEmpty = parsed.read(() => getRoot().getChildrenSize() === 0);
          if (isEmpty) {
            removeStorageKey(STORAGE_KEY);
            ensureEditorRootNotEmpty();
          } else {
            editor.setEditorState(parsed);
          }
        } catch {
          removeStorageKey(STORAGE_KEY);
          ensureEditorRootNotEmpty();
        }
      } else {
        ensureEditorRootNotEmpty();
      }
    }

    // Also listen for selection changes via the native selectionchange event
    // to catch cases where the user clicks to collapse the selection
    function onSelectionChange() {
      if (get(selectionMenuPinned)) {
        return;
      }
      const nativeSelection = window.getSelection();
      if (
        !nativeSelection ||
        nativeSelection.isCollapsed ||
        nativeSelection.rangeCount === 0
      ) {
        selectionInfo.set(null);
        if (get(selectionMenuSuppressed)) {
          selectionMenuSuppressed.set(false);
        }
        return;
      }
      if (get(selectionMenuSuppressed)) {
        return;
      }
      // If there is a non-collapsed native selection, read from Lexical
      editor!.getEditorState().read(() => {
        const selection = getSelection();
        if (
          isRangeSelection(selection) &&
          !selection.isCollapsed() &&
          selection.getTextContent().trim().length > 0
        ) {
          const range = nativeSelection.getRangeAt(0);
          if (
            !editorRef ||
            !editorRef.contains(range.commonAncestorContainer)
          ) {
            return;
          }
          const rect = range.getBoundingClientRect();
          selectionInfo.set({
            text: selection.getTextContent(),
            anchorRect: rect,
          });
        } else {
          selectionInfo.set(null);
        }
      });
    }

    document.addEventListener("selectionchange", onSelectionChange);
    const origCleanup = cleanup;
    const unsubscribeComments = comments.subscribe(() => {
      queueReconcileComments();
    });

    cleanup = () => {
      origCleanup();
      unsubscribeComments();
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  });

  onDestroy(() => {
    markdownShortcutsCleanup?.();
    cleanup?.();
    editorInstance.set(null);
  });

  $: if (editor && !markdownShortcutsCleanup) {
    markdownShortcutsCleanup = registerMarkdownShortcuts(
      editor,
      allTransformers,
    );
  }
</script>

<div class="editor-container">
  <div class="editor" bind:this={editorRef} contenteditable="true"></div>
  {#if editor && editorRef}
    <DragHandle {editor} editorRootEl={editorRef} />
  {/if}
</div>
