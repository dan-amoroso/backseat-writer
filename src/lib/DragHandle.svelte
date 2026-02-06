<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    $getNodeByKey as getNodeByKey,
    $getRoot as getRoot,
    type LexicalEditor,
  } from "lexical";
  import {
    $isListNode as isListNode,
    $isListItemNode as isListItemNode,
  } from "@lexical/list";

  export let editor: LexicalEditor;
  export let editorRootEl: HTMLDivElement;

  interface BlockHandle {
    key: string;
    groupKey: string;
    top: number;
    left: number;
  }

  let handles: BlockHandle[] = [];
  let isDragging = false;
  let dragSourceKey: string | null = null;
  let dragGroupKey: string | null = null;
  let dropTargetKey: string | null = null;
  let dropBefore = true;
  let indicatorVisible = false;
  let indicatorTop = 0;

  function updateHandles() {
    if (!editorRootEl || !editorRootEl.parentElement) return;
    const containerRect = editorRootEl.parentElement.getBoundingClientRect();
    const next: BlockHandle[] = [];

    editor.getEditorState().read(() => {
      const root = getRoot();
      const rootKey = root.getKey();
      const children = root.getChildren();

      const pushHandleForKey = (key: string, groupKey: string) => {
        const el = editor.getElementByKey(key);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        next.push({
          key,
          groupKey,
          top: rect.top - containerRect.top,
          left: 8,
        });
      };

      const pushListItemHandles = (listNode: import("lexical").LexicalNode) => {
        if (!isListNode(listNode)) return;
        const listKey = listNode.getKey();
        const items = listNode.getChildren().filter(isListItemNode);
        for (const item of items) {
          pushHandleForKey(item.getKey(), listKey);

          // Nested lists live inside list items; recurse to pick up their items too.
          const stack = [...item.getChildren()];
          while (stack.length > 0) {
            const node = stack.pop();
            if (!node) continue;
            if (isListNode(node)) {
              pushListItemHandles(node);
              continue;
            }
            if (
              "getChildren" in node &&
              typeof node.getChildren === "function"
            ) {
              stack.push(
                ...(node.getChildren() as import("lexical").LexicalNode[]),
              );
            }
          }
        }
      };

      for (const child of children) {
        if (isListNode(child)) {
          // Lists are treated as a collection of independently draggable items.
          pushListItemHandles(child);
          continue;
        }
        pushHandleForKey(child.getKey(), rootKey);
      }
    });

    handles = next;
  }

  function onPointerDown(e: PointerEvent, handle: BlockHandle) {
    e.preventDefault();
    isDragging = true;
    dragSourceKey = handle.key;
    dragGroupKey = handle.groupKey;

    const el = editor.getElementByKey(handle.key);
    if (el) el.classList.add("drag-source");

    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
  }

  function onDragMove(e: PointerEvent) {
    if (!isDragging || !editorRootEl.parentElement || !dragGroupKey) return;
    const containerRect = editorRootEl.parentElement.getBoundingClientRect();

    let closestDist = Infinity;
    let closestKey: string | null = null;
    let before = true;
    let closestY = 0;

    const candidates = handles.filter((h) => h.groupKey === dragGroupKey);
    for (const candidate of candidates) {
      if (candidate.key === dragSourceKey) continue;
      const el = editor.getElementByKey(candidate.key);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const topDist = Math.abs(e.clientY - rect.top);
      const botDist = Math.abs(e.clientY - rect.bottom);

      if (topDist < closestDist) {
        closestDist = topDist;
        closestY = rect.top - containerRect.top;
        closestKey = candidate.key;
        before = true;
      }
      if (botDist < closestDist) {
        closestDist = botDist;
        closestY = rect.bottom - containerRect.top;
        closestKey = candidate.key;
        before = false;
      }
    }

    if (closestKey && closestKey !== dragSourceKey) {
      dropTargetKey = closestKey;
      dropBefore = before;
      indicatorTop = closestY;
      indicatorVisible = true;
    } else {
      indicatorVisible = false;
      dropTargetKey = null;
    }
  }

  function onDragEnd() {
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);

    if (dragSourceKey) {
      const el = editor.getElementByKey(dragSourceKey);
      if (el) el.classList.remove("drag-source");
    }

    if (isDragging && dragSourceKey && dropTargetKey) {
      const srcKey = dragSourceKey;
      const tgtKey = dropTargetKey;
      const insertBefore = dropBefore;

      editor.update(() => {
        const sourceNode = getNodeByKey(srcKey);
        const targetNode = getNodeByKey(tgtKey);
        if (sourceNode && targetNode && sourceNode !== targetNode) {
          sourceNode.remove();
          if (insertBefore) {
            targetNode.insertBefore(sourceNode);
          } else {
            targetNode.insertAfter(sourceNode);
          }
        }
      });
    }

    isDragging = false;
    dragSourceKey = null;
    dragGroupKey = null;
    dropTargetKey = null;
    indicatorVisible = false;
  }

  let unregisterUpdate: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;

  onMount(() => {
    unregisterUpdate = editor.registerUpdateListener(() => {
      requestAnimationFrame(updateHandles);
    });

    resizeObserver = new ResizeObserver(() => {
      updateHandles();
    });
    if (editorRootEl.parentElement) {
      resizeObserver.observe(editorRootEl.parentElement);
    }

    updateHandles();
  });

  onDestroy(() => {
    unregisterUpdate?.();
    resizeObserver?.disconnect();
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
  });
</script>

{#each handles as handle (handle.key)}
  <div
    class="drag-handle"
    class:drag-handle-dragging={isDragging && dragSourceKey === handle.key}
    style="top: {handle.top}px; left: {handle.left}px;"
    on:pointerdown={(e) => onPointerDown(e, handle)}
    role="button"
    tabindex="-1"
    aria-label="Drag to reorder"
  >
    ⠿
  </div>
{/each}
{#if indicatorVisible}
  <div class="drag-drop-indicator" style="top: {indicatorTop}px;"></div>
{/if}
