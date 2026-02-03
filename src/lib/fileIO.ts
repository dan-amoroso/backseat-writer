import type { Comment } from "$lib/comments";

export interface BackseatWriterFile {
  version: 1;
  writingType: string;
  editorState: Record<string, unknown>;
  comments: Comment[];
}

export function serializeDocument(
  editorState: string,
  comments: Comment[],
  writingType: string,
): string {
  const doc: BackseatWriterFile = {
    version: 1,
    writingType,
    editorState: JSON.parse(editorState),
    comments,
  };
  return JSON.stringify(doc, null, 2);
}

export function deserializeDocument(json: string): BackseatWriterFile {
  const parsed = JSON.parse(json);
  if (!parsed || parsed.version !== 1) {
    throw new Error("Unsupported file format");
  }
  return parsed as BackseatWriterFile;
}

const BSW_FILE_TYPE = {
  description: "Backseat Writer",
  accept: { "application/json": [".bsw"] } as Record<string, string[]>,
};

function hasFileSystemAccess(): boolean {
  return "showSaveFilePicker" in window && "showOpenFilePicker" in window;
}

export async function saveFile(content: string): Promise<void> {
  if (hasFileSystemAccess()) {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: "untitled.bsw",
      types: [BSW_FILE_TYPE],
    });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "untitled.bsw";
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function openFile(): Promise<string> {
  if (hasFileSystemAccess()) {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [BSW_FILE_TYPE],
      multiple: false,
    });
    const file = await handle.getFile();
    return await file.text();
  } else {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".bsw";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error("No file selected"));
          return;
        }
        resolve(await file.text());
      });
      input.click();
    });
  }
}
