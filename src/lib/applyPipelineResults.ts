import type { LexicalEditor } from "lexical";
import { createTarget } from "$lib/nodes/TargetNode";
import { addComment } from "$lib/comments";
import type { PipelineResult, ApplyResult } from "$lib/pipeline";

export function applyPipelineResults(
  editor: LexicalEditor,
  pipelineResult: PipelineResult,
): ApplyResult {
  let commentsCreated = 0;
  let commentsFailed = 0;
  const failedComments: PipelineResult["results"][number]["comments"] = [];

  const allComments = pipelineResult.results.flatMap((r) => r.comments);

  if (allComments.length === 0) {
    return { commentsCreated, commentsFailed, failedComments };
  }

  editor.update(
    () => {
      for (const comment of allComments) {
        const targetId = createTarget(comment.targetText);
        if (targetId) {
          addComment(targetId, comment.author, comment.body);
          commentsCreated++;
        } else {
          commentsFailed++;
          failedComments.push(comment);
        }
      }
    },
    { discrete: true },
  );

  return { commentsCreated, commentsFailed, failedComments };
}
