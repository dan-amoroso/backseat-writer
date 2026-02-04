<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";
  import {
    FORMAT_TEXT_COMMAND,
    $createParagraphNode as createParagraphNode,
    $getNearestNodeFromDOMNode as getNearestNodeFromDOMNode,
    $getSelection as getSelection,
    $isRangeSelection as isRangeSelection,
    type EditorState,
    type LexicalEditor,
  } from "lexical";
  import { $setBlocksType as setBlocksType } from "@lexical/selection";
  import {
    $createHeadingNode as createHeadingNode,
    $createQuoteNode as createQuoteNode,
    $isHeadingNode as isHeadingNode,
    $isQuoteNode as isQuoteNode,
  } from "@lexical/rich-text";
  import {
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    REMOVE_LIST_COMMAND,
    $isListNode as isListNode,
  } from "@lexical/list";
  import { editorInstance } from "$lib/editorInstance";

  export let placement: "header" | "editor" = "editor";

  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrikethrough = false;
  let isCode = false;
  let isQuote = false;
  let headingTag: "h1" | "h2" | "h3" | null = null;
  let isOrderedList = false;
  let isUnorderedList = false;

  type HoverBlock = {
    isQuote: boolean;
    headingTag: "h1" | "h2" | "h3" | null;
    isOrderedList: boolean;
    isUnorderedList: boolean;
  };

  let hoverBlock: HoverBlock | null = null;

  let unregisterUpdateListener: (() => void) | null = null;
  let unregisterRootListener: (() => void) | null = null;
  let unsubscribeEditorInstance: (() => void) | null = null;
  let rootMouseMoveHandler: ((event: MouseEvent) => void) | null = null;
  let rootMouseLeaveHandler: (() => void) | null = null;
  let currentRootElement: HTMLElement | null = null;
  let hoverRafId: number | null = null;
  let hoverTarget: Node | null = null;

  function updateToolbarState(editorState: EditorState) {
    editorState.read(() => {
      const selection = getSelection();
      if (!isRangeSelection(selection)) {
        isBold = false;
        isItalic = false;
        isUnderline = false;
        isStrikethrough = false;
        isCode = false;
        if (hoverBlock) {
          isQuote = hoverBlock.isQuote;
          headingTag = hoverBlock.headingTag;
          isOrderedList = hoverBlock.isOrderedList;
          isUnorderedList = hoverBlock.isUnorderedList;
        } else {
          isQuote = false;
          headingTag = null;
          isOrderedList = false;
          isUnorderedList = false;
        }
        return;
      }

      isBold = selection.hasFormat("bold");
      isItalic = selection.hasFormat("italic");
      isUnderline = selection.hasFormat("underline");
      isStrikethrough = selection.hasFormat("strikethrough");
      isCode = selection.hasFormat("code");

      const isCollapsed = selection.isCollapsed();
      if (isCollapsed && hoverBlock) {
        isQuote = hoverBlock.isQuote;
        headingTag = hoverBlock.headingTag;
        isOrderedList = hoverBlock.isOrderedList;
        isUnorderedList = hoverBlock.isUnorderedList;
        return;
      }

      const topLevel = selection.anchor.getNode().getTopLevelElementOrThrow();
      isQuote = isQuoteNode(topLevel);
      if (isHeadingNode(topLevel)) {
        const tag = topLevel.getTag();
        headingTag = tag === "h1" || tag === "h2" || tag === "h3" ? tag : null;
      } else {
        headingTag = null;
      }
      isOrderedList =
        isListNode(topLevel) && topLevel.getListType() === "number";
      isUnorderedList =
        isListNode(topLevel) && topLevel.getListType() === "bullet";
    });
  }

  function areHoverBlocksEqual(a: HoverBlock | null, b: HoverBlock | null) {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
      a.isQuote === b.isQuote &&
      a.headingTag === b.headingTag &&
      a.isOrderedList === b.isOrderedList &&
      a.isUnorderedList === b.isUnorderedList
    );
  }

  function setHoverBlock(next: HoverBlock | null, editor: LexicalEditor) {
    if (areHoverBlocksEqual(hoverBlock, next)) return;
    hoverBlock = next;
    updateToolbarState(editor.getEditorState());
  }

  onMount(() => {
    unsubscribeEditorInstance = editorInstance.subscribe((editor) => {
      if (currentRootElement && rootMouseMoveHandler) {
        currentRootElement.removeEventListener(
          "mousemove",
          rootMouseMoveHandler,
        );
      }
      if (currentRootElement && rootMouseLeaveHandler) {
        currentRootElement.removeEventListener(
          "mouseleave",
          rootMouseLeaveHandler,
        );
      }
      currentRootElement = null;
      rootMouseMoveHandler = null;
      rootMouseLeaveHandler = null;

      unregisterUpdateListener?.();
      unregisterUpdateListener = null;
      unregisterRootListener?.();
      unregisterRootListener = null;
      hoverBlock = null;

      if (!editor) return;
      unregisterUpdateListener = editor.registerUpdateListener(
        ({ editorState }) => {
          updateToolbarState(editorState);
        },
      );
      unregisterRootListener = editor.registerRootListener(
        (rootElement, prevRootElement) => {
          if (prevRootElement && rootMouseMoveHandler) {
            prevRootElement.removeEventListener(
              "mousemove",
              rootMouseMoveHandler,
            );
          }
          if (prevRootElement && rootMouseLeaveHandler) {
            prevRootElement.removeEventListener(
              "mouseleave",
              rootMouseLeaveHandler,
            );
          }

          rootMouseMoveHandler = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            hoverTarget = target;
            if (hoverRafId != null) return;
            hoverRafId = requestAnimationFrame(() => {
              hoverRafId = null;
              const nextTarget = hoverTarget;
              if (!nextTarget) return;
              const state = editor.getEditorState();
              state.read(() => {
                const nearest = getNearestNodeFromDOMNode(nextTarget, state);
                if (!nearest) {
                  setHoverBlock(null, editor);
                  return;
                }
                let topLevel;
                try {
                  topLevel = nearest.getTopLevelElementOrThrow();
                } catch {
                  setHoverBlock(null, editor);
                  return;
                }

                const nextHeadingTag = isHeadingNode(topLevel)
                  ? (() => {
                      const tag = topLevel.getTag();
                      return tag === "h1" || tag === "h2" || tag === "h3"
                        ? tag
                        : null;
                    })()
                  : null;

                const next: HoverBlock = {
                  isQuote: isQuoteNode(topLevel),
                  headingTag: nextHeadingTag,
                  isOrderedList:
                    isListNode(topLevel) && topLevel.getListType() === "number",
                  isUnorderedList:
                    isListNode(topLevel) && topLevel.getListType() === "bullet",
                };
                setHoverBlock(next, editor);
              });
            });
          };

          rootMouseLeaveHandler = () => {
            hoverTarget = null;
            if (hoverRafId != null) {
              cancelAnimationFrame(hoverRafId);
              hoverRafId = null;
            }
            setHoverBlock(null, editor);
          };

          rootElement?.addEventListener("mousemove", rootMouseMoveHandler);
          rootElement?.addEventListener("mouseleave", rootMouseLeaveHandler);
          currentRootElement = rootElement;
        },
      );
      updateToolbarState(editor.getEditorState());
    });
  });

  onDestroy(() => {
    if (currentRootElement && rootMouseMoveHandler) {
      currentRootElement.removeEventListener("mousemove", rootMouseMoveHandler);
    }
    if (currentRootElement && rootMouseLeaveHandler) {
      currentRootElement.removeEventListener(
        "mouseleave",
        rootMouseLeaveHandler,
      );
    }
    unregisterUpdateListener?.();
    unregisterRootListener?.();
    unsubscribeEditorInstance?.();
  });

  function withEditor(fn: (editor: LexicalEditor) => void) {
    const editor = get(editorInstance);
    if (!editor) return;
    editor.focus();
    fn(editor);
  }

  function formatText(
    type: "bold" | "italic" | "underline" | "strikethrough" | "code",
  ) {
    withEditor((editor) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);
    });
  }

  function setHeading(tag: "h1" | "h2" | "h3") {
    withEditor((editor) => {
      editor.update(() => {
        const selection = getSelection();
        if (!isRangeSelection(selection)) return;
        const topLevel = selection.anchor.getNode().getTopLevelElementOrThrow();
        if (isHeadingNode(topLevel) && topLevel.getTag() === tag) {
          setBlocksType(selection, () => createParagraphNode());
        } else {
          setBlocksType(selection, () => createHeadingNode(tag));
        }
      });
    });
  }

  function setQuote() {
    withEditor((editor) => {
      editor.update(() => {
        const selection = getSelection();
        if (!isRangeSelection(selection)) return;
        const topLevel = selection.anchor.getNode().getTopLevelElementOrThrow();
        if (isQuoteNode(topLevel)) {
          setBlocksType(selection, () => createParagraphNode());
        } else {
          setBlocksType(selection, () => createQuoteNode());
        }
      });
    });
  }

  function insertList(kind: "ordered" | "unordered") {
    withEditor((editor) => {
      editor.update(() => {
        const selection = getSelection();
        if (!isRangeSelection(selection)) return;
        const topLevel = selection.anchor.getNode().getTopLevelElementOrThrow();
        const listType = isListNode(topLevel) ? topLevel.getListType() : null;
        const wants = kind === "ordered" ? "number" : "bullet";
        if (listType === wants) {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
          return;
        }
        editor.dispatchCommand(
          kind === "ordered"
            ? INSERT_ORDERED_LIST_COMMAND
            : INSERT_UNORDERED_LIST_COMMAND,
          undefined,
        );
      });
    });
  }
</script>

<div
  class="formatting-toolbar"
  class:formatting-toolbar-header={placement === "header"}
  role="toolbar"
  aria-label="Text formatting"
>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => formatText("bold")}
    aria-label="Bold"
    title="Bold"
    aria-pressed={isBold}
    type="button"
  >
    <strong>B</strong>
  </button>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => formatText("italic")}
    aria-label="Italic"
    title="Italic"
    aria-pressed={isItalic}
    type="button"
  >
    <em>I</em>
  </button>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => formatText("underline")}
    aria-label="Underline"
    title="Underline"
    aria-pressed={isUnderline}
    type="button"
  >
    <span class="formatting-underline">U</span>
  </button>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => formatText("strikethrough")}
    aria-label="Strikethrough"
    title="Strikethrough"
    aria-pressed={isStrikethrough}
    type="button"
  >
    <span class="formatting-strike">S</span>
  </button>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => formatText("code")}
    aria-label="Inline code"
    title="Inline code"
    aria-pressed={isCode}
    type="button"
  >
    <span class="formatting-code">{`<>`}</span>
  </button>
  <span class="formatting-divider" aria-hidden="true"></span>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => setHeading("h1")}
    aria-label="Heading 1"
    title="Heading 1"
    aria-pressed={headingTag === "h1"}
    type="button"
  >
    H1
  </button>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => setHeading("h2")}
    aria-label="Heading 2"
    title="Heading 2"
    aria-pressed={headingTag === "h2"}
    type="button"
  >
    H2
  </button>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => setHeading("h3")}
    aria-label="Heading 3"
    title="Heading 3"
    aria-pressed={headingTag === "h3"}
    type="button"
  >
    H3
  </button>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={setQuote}
    aria-label="Quote"
    title="Quote"
    aria-pressed={isQuote}
    type="button"
  >
    “”
  </button>
  <span class="formatting-divider" aria-hidden="true"></span>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => insertList("unordered")}
    aria-label="Bulleted list"
    title="Bulleted list"
    aria-pressed={isUnorderedList}
    type="button"
  >
    ••
  </button>
  <button
    class="formatting-btn"
    on:mousedown|preventDefault
    on:click={() => insertList("ordered")}
    aria-label="Numbered list"
    title="Numbered list"
    aria-pressed={isOrderedList}
    type="button"
  >
    1.
  </button>
</div>
