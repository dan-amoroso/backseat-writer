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
    $convertFromMarkdownString as convertFromMarkdownString,
    $convertToMarkdownString as convertToMarkdownString,
    type TextMatchTransformer,
  } from "@lexical/markdown";
  import { ListNode, ListItemNode } from "@lexical/list";
  import { LinkNode } from "@lexical/link";
  import { CodeNode, CodeHighlightNode } from "@lexical/code";
  import {
    TargetNode,
    $createTargetNode as createTargetNode,
    $isTargetNode as isTargetNode,
    $toggleTarget as toggleTarget,
    TOGGLE_TARGET_COMMAND,
  } from "$lib/nodes/TargetNode";
  import editorThemeClasses from "$lib/editorThemeClasses";
  import { get, writable } from "svelte/store";
  import { loadJson, saveJson } from "$lib/storage";
  import { editorInstance } from "$lib/editorInstance";
  import {
    selectionInfo,
    selectionMenuPinned,
    selectionMenuSuppressed,
  } from "$lib/selectionInfo";

  const STORAGE_KEY = "editor-state";

  const TARGET: TextMatchTransformer = {
    dependencies: [TargetNode],
    export: (node, exportChildren) => {
      if (!isTargetNode(node)) {
        return null;
      }
      return `==${exportChildren(node)}==`;
    },
    importRegExp: /(?:==)(.+?)(?:==)/,
    regExp: /(?:==)(.+?)(?:==)$/,
    replace: (textNode, match) => {
      const [, text] = match;
      const targetId = crypto.randomUUID();
      const targetNode = createTargetNode([targetId]);
      const targetTextNode = createTextNode(text);
      targetTextNode.setFormat(textNode.getFormat());
      targetNode.append(targetTextNode);
      textNode.replace(targetNode);
    },
    trigger: "=",
    type: "text-match",
  };

  const allTransformers = [...TRANSFORMERS, TARGET];

  export const editorStateJson = writable<string>("{}");

  let editorRef: HTMLDivElement;
  let editor: ReturnType<typeof createEditor> | null = null;
  let cleanup: (() => void) | undefined;
  let markdownText = "";
  let lastMode: "rich" | "markdown" = "rich";
  let markdownShortcutsCleanup: (() => void) | null = null;

  export let mode: "rich" | "markdown" = "rich";

  export function undo() {
    editor?.dispatchCommand(UNDO_COMMAND, undefined);
  }

  export function redo() {
    editor?.dispatchCommand(REDO_COMMAND, undefined);
  }

  function getMarkdownFromEditor() {
    if (!editor) return "";
    return editor
      .getEditorState()
      .read(() => convertToMarkdownString(allTransformers));
  }

  function applyMarkdownToEditor(markdown: string) {
    if (!editor) return;
    editor.update(() => {
      const root = getRoot();
      root.clear();
      convertFromMarkdownString(markdown, allTransformers, root);
    });
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

    const saved = loadJson<Record<string, unknown> | null>(STORAGE_KEY, null);
    if (saved) {
      const parsed = editor.parseEditorState(JSON.stringify(saved));
      editor.setEditorState(parsed);
      editorStateJson.set(JSON.stringify(saved, null, 2));
    }

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
          editorStateJson.set(JSON.stringify(json, null, 2));

          // Track selection for the action menu
          editorState.read(() => {
            if (mode === "markdown") {
              markdownText = getRoot().getTextContent();
            }
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
        },
      ),
    );

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
    cleanup = () => {
      origCleanup();
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  });

  onDestroy(() => {
    markdownShortcutsCleanup?.();
    cleanup?.();
    editorInstance.set(null);
  });

  $: if (editor && mode !== lastMode) {
    if (mode === "markdown") {
      markdownText = getMarkdownFromEditor();
      applyPlainTextToEditor(markdownText);
      markdownShortcutsCleanup?.();
      markdownShortcutsCleanup = null;
    } else {
      applyMarkdownToEditor(markdownText);
    }
    lastMode = mode;
  }

  $: if (editor && mode === "rich" && !markdownShortcutsCleanup) {
    markdownShortcutsCleanup = registerMarkdownShortcuts(
      editor,
      allTransformers,
    );
  }
</script>

<div class="editor-container">
  <div class="editor" bind:this={editorRef} contenteditable="true"></div>
</div>
