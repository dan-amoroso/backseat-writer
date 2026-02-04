<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";

  const DEMO_EDITOR_STATE = {
    root: {
      children: [
        {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: "Hi, this is Dan. I've been working on my writing",
                  type: "text",
                  version: 1,
                },
              ],
              direction: null,
              format: "",
              indent: 0,
              type: "target",
              version: 1,
              targetIds: ["3e2dddf7-771e-4c23-9167-4e347923f7d3"],
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "heading",
          version: 1,
          tag: "h1",
        },
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: "I am writing at least 1000 words every day. Building Backseat Writer makes it more fun. This app is built to leverage AI but keep the human in the driving seat, while the AI nags them. I'm expanding the app and would value your feedback (check the about page). ",
              type: "text",
              version: 1,
            },
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: "(get it ? :)",
                  type: "text",
                  version: 1,
                },
              ],
              direction: null,
              format: "",
              indent: 0,
              type: "target",
              version: 1,
              targetIds: ["79ecce4d-ecbe-4be8-bf4b-46a63ca507d0"],
            },
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: " . ",
              type: "text",
              version: 1,
            },
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: "Please try Backseat Writer and tell me what's missing! Thanks in advance!",
                  type: "text",
                  version: 1,
                },
              ],
              direction: null,
              format: "",
              indent: 0,
              type: "target",
              version: 1,
              targetIds: ["1bfc2d81-40e0-4adb-9b05-bd18707a9992"],
            },
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: " Would you like to use something like this? What would you need for it to be useful for you? ",
              type: "text",
              version: 1,
            },
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: "The app is meant to stay free, this is not SaaS market research, but it is a small component of a product I would like to develop someday.",
                  type: "text",
                  version: 1,
                },
              ],
              direction: null,
              format: "",
              indent: 0,
              type: "target",
              version: 1,
              targetIds: [
                "5e44868b-0f2e-418c-b810-7807b1fe8083",
                "2ec1480a-0a65-4c13-90a1-a82afd06e9c3",
              ],
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
          textFormat: 0,
          textStyle: "",
        },
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: "Why?",
              type: "text",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "heading",
          version: 1,
          tag: "h2",
        },
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: "because how else would I burn my free credits?",
              type: "text",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
          textFormat: 0,
          textStyle: "",
        },
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: "How?",
              type: "text",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "heading",
          version: 1,
          tag: "h2",
        },
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: 'write your stuff, hit "get feedback" and convert energy to heat. Also Comments should appear, notion-like.',
              type: "text",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
          textFormat: 0,
          textStyle: "",
        },
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: "You can configure your own personas with custom prompt, so you can passive-aggresively demand that your grammar checker stop correcting your british english spelling, if you are into that. It mostly works depending on the model. I find the dumb models to be more fun.",
              type: "text",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
          textFormat: 0,
          textStyle: "",
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
  const DEMO_COMMENTS = [
    {
      id: "comment-1770187445939",
      targetId: "3e2dddf7-771e-4c23-9167-4e347923f7d3",
      targetText: "Hi, I am Dan, I am trying to improve my writing",
      author: "HN Snark",
      body: "actually, the opener reads like a status update, not a hook. You’re promising improvement but not giving the reader a reason to care. Try leading with the concrete problem you’re solving or a specific outcome.",
    },
    {
      id: "comment-1770187445942",
      targetId: "1bfc2d81-40e0-4adb-9b05-bd18707a9992",
      targetText:
        "I plan to extend it, because it makes writing more fun for me, but I would love to hear opinions if you have time and feel like sharing.",
      author: "HN Snark",
      body: "actually, this is a vague plea for “opinions.” You want actionable input, so ask for a concrete thing: what feature would make them use it weekly, or what’s missing that blocks adoption.",
    },
    {
      id: "comment-1770187445943",
      targetId: "5e44868b-0f2e-418c-b810-7807b1fe8083",
      targetText:
        "The app is meant to stay free, this is not SaaS market research, but it is a small component of a product I would like to develop someday.",
      author: "HN Snark",
      body: "actually, this reads defensive and distracts from the main point. If it’s free, fine—say it once. Otherwise it feels like pre-emptive justification instead of a clear pitch.",
    },
    {
      id: "comment-1770187445944",
      targetId: "2ec1480a-0a65-4c13-90a1-a82afd06e9c3",
      targetText:
        "The app is meant to stay free, this is not SaaS market research, but it is a small component of a product I would like to develop someday.",
      author: "HN Snark",
      body: "actually, you’re burying the lede. If this is a stepping stone to a bigger product, say what that product is or why anyone should care now.",
    },
  ];

  onMount(async () => {
    if (!browser) return;
    localStorage.setItem(
      "backseatwriter:editor-state",
      JSON.stringify(DEMO_EDITOR_STATE),
    );
    localStorage.setItem(
      "backseatwriter:comments",
      JSON.stringify(DEMO_COMMENTS),
    );
    await goto("/");
  });
</script>

<main class="about-page">
  <header class="about-header">
    <h1>Preparing demo…</h1>
  </header>
  <section class="about-body">
    <p>Loading the demo editor state.</p>
    <p>
      New here? Read the <a href="/about">About page</a> for context.
    </p>
  </section>
</main>
