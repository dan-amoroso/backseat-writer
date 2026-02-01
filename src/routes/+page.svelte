<script lang="ts">
	import Editor from '$lib/Editor.svelte';
	import CommentBubble from '$lib/CommentBubble.svelte';
	import { comments } from '$lib/comments';
	import vscodeTheme from '$lib/themes/vscode';
	import intellijTheme from '$lib/themes/intellij';
	import type { EditorTheme } from '$lib/themes/types';
	import type { Writable } from 'svelte/store';

	const themes: EditorTheme[] = [vscodeTheme, intellijTheme];
	let selectedTheme = themes[0];

	const writingTypes = ['Blog Post', 'Essay'];
	let selectedWritingType = writingTypes[0];

	let editorStateJson: Writable<string>;

	function onThemeChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		selectedTheme = themes[select.selectedIndex];
	}
</script>

<main>
	<div class="header">
		<h1>Backseat Writer</h1>
		<div class="header-controls">
			<label>
				What are we writing?
				<select bind:value={selectedWritingType}>
					{#each writingTypes as wt}
						<option>{wt}</option>
					{/each}
				</select>
			</label>
			<select on:change={onThemeChange}>
				{#each themes as t}
					<option>{t.name}</option>
				{/each}
			</select>
		</div>
	</div>
	<div class="workspace">
		<div class="editor-pane">
			<Editor theme={selectedTheme} bind:editorStateJson />
		</div>
		<aside class="comments-pane">
			{#each $comments as comment (comment.id)}
				<CommentBubble {comment} />
			{/each}
		</aside>
	</div>
	{#if editorStateJson}
		<details class="state-debug">
			<summary>Editor State</summary>
			<pre>{$editorStateJson}</pre>
		</details>
	{/if}
</main>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 32px 16px;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24px;
	}

	h1 {
		margin: 0;
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
		font-size: 14px;
		color: #d4d4d4;
	}

	select {
		padding: 6px 12px;
		border-radius: 4px;
		border: 1px solid #3c3c3c;
		background: #2d2d2d;
		color: #d4d4d4;
		font-size: 14px;
		cursor: pointer;
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

	.state-debug {
		margin-top: 24px;
		border: 1px solid #3c3c3c;
		border-radius: 4px;
		background: #1e1e1e;
	}

	.state-debug summary {
		padding: 8px 12px;
		cursor: pointer;
		font-size: 13px;
		color: #808080;
		user-select: none;
	}

	.state-debug pre {
		margin: 0;
		padding: 12px 16px;
		font-size: 12px;
		line-height: 1.5;
		color: #d4d4d4;
		overflow-x: auto;
		border-top: 1px solid #3c3c3c;
	}
</style>
