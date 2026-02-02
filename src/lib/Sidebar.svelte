<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let settingsActive = false;

  const dispatch = createEventDispatcher();
</script>

<nav class="sidebar">
  <div class="sidebar-top">
    <!-- Future nav items go here -->
  </div>
  <div class="sidebar-bottom">
    <button
      class="sidebar-item"
      class:sidebar-item-active={settingsActive}
      on:click={() => dispatch("settings")}
      aria-label="Settings"
    >
      <svg
        width="24"
        height="24"
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
      <span class="sidebar-label">Settings</span>
    </button>
  </div>
</nav>

<style>
  .sidebar {
    width: 5rem;
    flex-shrink: 0;
    height: 100vh;
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.02);
    border-right: 1px solid rgba(255, 255, 255, 0.06);
  }

  .sidebar-top {
    flex: 1;
  }

  .sidebar-bottom {
    margin-top: auto;
    padding-bottom: 16px;
  }

  .sidebar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    padding: 12px 0;
    border: none;
    background: none;
    color: #4a4a4a;
    cursor: pointer;
    transition:
      color 0.15s ease-out,
      background 0.15s ease-out;
  }

  .sidebar-item:hover {
    color: #a0a0a0;
    background: rgba(255, 255, 255, 0.04);
  }

  .sidebar-item:focus-visible {
    outline: none;
    background: rgba(86, 156, 214, 0.1);
    color: #a0a0a0;
  }

  .sidebar-item-active {
    color: #569cd6;
  }

  .sidebar-item-active:hover {
    color: #569cd6;
  }

  .sidebar-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1;
  }
</style>
