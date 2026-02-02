<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    createEditor,
    $createTextNode as createTextNode,
    $getSelection as getSelection,
    $isRangeSelection as isRangeSelection,
    KEY_DOWN_COMMAND,
    COMMAND_PRIORITY_LOW,
    COMMAND_PRIORITY_NORMAL,
    type EditorState,
  } from "lexical";
  import { registerRichText, HeadingNode, QuoteNode } from "@lexical/rich-text";
  import {
    mergeRegister,
    $findMatchingParent as findMatchingParent,
  } from "@lexical/utils";
  import {
    registerMarkdownShortcuts,
    TRANSFORMERS,
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
  import classes from "$lib/themes/classes";
  import vscodeTheme from "$lib/themes/vscode";
  import { writable } from "svelte/store";
  import { loadJson, saveJson } from "$lib/storage";
  import { editorInstance } from "$lib/editorInstance";

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
      const targetNode = createTargetNode(targetId);
      const targetTextNode = createTextNode(text);
      targetTextNode.setFormat(textNode.getFormat());
      targetNode.append(targetTextNode);
      textNode.replace(targetNode);
    },
    trigger: "=",
    type: "text-match",
  };

  export const editorStateJson = writable<string>("{}");

  let editorRef: HTMLDivElement;
  let styleEl: HTMLStyleElement;
  let cleanup: (() => void) | undefined;

  $: if (styleEl) {
    styleEl.textContent = vscodeTheme.styles;
  }

  onMount(() => {
    styleEl = document.createElement("style");
    styleEl.textContent = vscodeTheme.styles;
    document.head.appendChild(styleEl);

    const editor = createEditor({
      namespace: "BackseatWriter",
      theme: classes,
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

    const allTransformers = [...TRANSFORMERS, TARGET];

    cleanup = mergeRegister(
      registerRichText(editor),
      registerMarkdownShortcuts(editor, allTransformers),
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
                editor.dispatchCommand(TOGGLE_TARGET_COMMAND, null);
              } else {
                editor.dispatchCommand(
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
        },
      ),
      () => styleEl.remove(),
    );
  });

  onDestroy(() => {
    cleanup?.();
    editorInstance.set(null);
  });
</script>

<div class="editor-container">
  <div class="editor" bind:this={editorRef} contenteditable="true"></div>
</div>
