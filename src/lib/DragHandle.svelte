<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    $getNodeByKey as getNodeByKey,
    $getRoot as getRoot,
    type LexicalEditor,
  } from "lexical";

  export let editor: LexicalEditor;
  export let editorRootEl: HTMLDivElement;

  interface BlockHandle {
    key: string;
    top: number;
  }

  let handles: BlockHandle[] = [];
  let isDragging = false;
  let dragSourceKey: string | null = null;
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
      const children = root.getChildren();
      for (const child of children) {
        const el = editor.getElementByKey(child.getKey());
        if (el) {
          const rect = el.getBoundingClientRect();
          next.push({
            key: child.getKey(),
            top: rect.top - containerRect.top,
          });
        }
      }
    });

    handles = next;
  }

  function onPointerDown(e: PointerEvent, handle: BlockHandle) {
    e.preventDefault();
    isDragging = true;
    dragSourceKey = handle.key;

    const el = editor.getElementByKey(handle.key);
    if (el) el.classList.add("drag-source");

    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
  }

  function onDragMove(e: PointerEvent) {
    if (!isDragging || !editorRootEl.parentElement) return;
    const containerRect = editorRootEl.parentElement.getBoundingClientRect();

    let closestDist = Infinity;
    let closestKey: string | null = null;
    let before = true;
    let closestY = 0;

    editor.getEditorState().read(() => {
      const root = getRoot();
      const children = root.getChildren();
      for (const child of children) {
        const el = editor.getElementByKey(child.getKey());
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const topDist = Math.abs(e.clientY - rect.top);
        const botDist = Math.abs(e.clientY - rect.bottom);

        if (topDist < closestDist) {
          closestDist = topDist;
          closestY = rect.top - containerRect.top;
          closestKey = child.getKey();
          before = true;
        }
        if (botDist < closestDist) {
          closestDist = botDist;
          closestY = rect.bottom - containerRect.top;
          closestKey = child.getKey();
          before = false;
        }
      }
    });

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
    style="top: {handle.top}px;"
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
