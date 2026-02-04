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
                  text: "Hi, I am Dan, I am trying to improve my writing",
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
              text: "I am trying to write every day: 1000 words. I am more of a technical writer as I work in tech, but I would like to expand into fiction too. This app is built to leverage AI but keep the human in the driving seat ",
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
                  text: "I plan to extend it, because it makes writing more fun for me, but I would love to hear opinions if you have time and feel like sharing.",
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
      author: "Writing Coach",
      body: "This opening is friendly but could be more engaging. Consider starting with a hook—maybe a question, bold statement, or intriguing anecdote—to draw readers in. For example: 'What if writing every day felt less like a chore and more like a creative adventure?'",
    },
    {
      id: "comment-1770187445942",
      targetId: "1bfc2d81-40e0-4adb-9b05-bd18707a9992",
      author: "Writing Coach",
      body: "This is a good call-to-action, but it could be more specific. Instead of 'opinions,' ask for concrete feedback: 'What features would make this tool indispensable for *your* writing process?' This encourages actionable responses.",
    },
    {
      id: "comment-1770187445943",
      targetId: "5e44868b-0f2e-418c-b810-7807b1fe8083",
      author: "Writing Coach",
      body: "This clarification is important, but it disrupts the flow. Try weaving it into the narrative earlier or rephrasing for conciseness: 'While this app will always be free, it’s also a stepping stone toward a larger vision—one I’d love to shape with your input.'",
    },
    {
      id: "comment-1770187445944",
      targetId: "2ec1480a-0a65-4c13-90a1-a82afd06e9c3",
      author: "Dan",
      body: "these comment (except this one) come from mistral-large-latest, I don't like this output at all. I am testing different models at the moment.",
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
  </section>
</main>
