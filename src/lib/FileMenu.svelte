<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { browser } from "$app/environment";

  const dispatch = createEventDispatcher<{
    new: void;
    open: void;
    save: void;
  }>();

  let open = false;

  function toggle() {
    open = !open;
  }

  function handleItem(action: "new" | "open" | "save") {
    open = false;
    dispatch(action);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      open = false;
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".file-menu")) {
      open = false;
    }
  }

  $: if (browser && open) {
    document.addEventListener("click", handleClickOutside, true);
  } else if (browser) {
    document.removeEventListener("click", handleClickOutside, true);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<nav class="file-menu">
  <button class="file-menu-trigger" on:click={toggle} type="button">
    File
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>
  {#if open}
    <ul class="file-menu-dropdown" role="menu">
      <li role="none">
        <button
          class="file-menu-item"
          role="menuitem"
          on:click={() => handleItem("new")}
          type="button"
        >
          New
        </button>
      </li>
      <li role="none">
        <button
          class="file-menu-item"
          role="menuitem"
          on:click={() => handleItem("open")}
          type="button"
        >
          Open...
        </button>
      </li>
      <li class="file-menu-separator" role="separator"></li>
      <li role="none">
        <button
          class="file-menu-item"
          role="menuitem"
          on:click={() => handleItem("save")}
          type="button"
        >
          Save
        </button>
      </li>
    </ul>
  {/if}
</nav>
