import {
  ElementNode,
  $applyNodeReplacement,
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  $isTextNode,
  $createTextNode,
  $setSelection,
  createCommand,
  type DOMConversionMap,
  type DOMConversionOutput,
  type EditorConfig,
  type LexicalCommand,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type RangeSelection,
  type SerializedElementNode,
  type Spread,
} from "lexical";
import { addClassNamesToElement, $findMatchingParent } from "@lexical/utils";

export type SerializedTargetNode = Spread<
  { targetIds: string[] },
  SerializedElementNode
>;

export type TargetId = string;

export class TargetNode extends ElementNode {
  __targetIds: string[];

  static getType(): string {
    return "target";
  }

  static clone(node: TargetNode): TargetNode {
    return new TargetNode([...node.__targetIds], node.__key);
  }

  constructor(targetIds: string[], key?: NodeKey) {
    super(key);
    this.__targetIds = targetIds;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement("mark");
    element.setAttribute("data-target-ids", this.__targetIds.join(","));
    addClassNamesToElement(element, config.theme.target);
    return element;
  }

  updateDOM(prevNode: TargetNode, element: HTMLElement): boolean {
    const prev = prevNode.__targetIds.join(",");
    const curr = this.__targetIds.join(",");
    if (prev !== curr) {
      element.setAttribute("data-target-ids", curr);
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      mark: (node: Node) => {
        const element = node as HTMLElement;
        if (
          !element.hasAttribute("data-target-ids") &&
          !element.hasAttribute("data-target-id")
        ) {
          return null;
        }
        return {
          conversion: $convertTargetElement,
          priority: 1,
        };
      },
    };
  }

  static importJSON(
    serializedNode: SerializedTargetNode & { targetId?: string },
  ): TargetNode {
    // Backward compat: accept legacy single targetId
    const ids =
      serializedNode.targetIds ??
      (serializedNode.targetId ? [serializedNode.targetId] : []);
    return $createTargetNode(ids).updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedTargetNode> & {
      targetId?: string;
    },
  ): this {
    const ids =
      serializedNode.targetIds ??
      (serializedNode.targetId ? [serializedNode.targetId] : []);
    return super.updateFromJSON(serializedNode).setTargetIds(ids);
  }

  exportJSON(): SerializedTargetNode {
    return {
      ...super.exportJSON(),
      targetIds: this.getTargetIds(),
    };
  }

  getTargetIds(): string[] {
    return this.getLatest().__targetIds;
  }

  setTargetIds(targetIds: string[]): this {
    const writable = this.getWritable();
    writable.__targetIds = targetIds;
    return writable;
  }

  addTargetId(targetId: string): this {
    const current = this.getTargetIds();
    if (current.includes(targetId)) {
      return this;
    }
    return this.setTargetIds([...current, targetId]);
  }

  insertNewAfter(
    _: RangeSelection,
    restoreSelection?: boolean,
  ): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(_, restoreSelection);
    if (element && element instanceof ElementNode) {
      return element;
    }
    return null;
  }

  canInsertTextBefore(): false {
    return false;
  }

  canInsertTextAfter(): false {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  isInline(): true {
    return true;
  }

  extractWithChild(child: LexicalNode, selection: RangeSelection): boolean {
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    return (
      this.isParentOf(anchorNode) &&
      this.isParentOf(focusNode) &&
      selection.getTextContent().length > 0
    );
  }
}

function $convertTargetElement(domNode: Node): DOMConversionOutput {
  const element = domNode as HTMLElement;
  // Support both new data-target-ids and legacy data-target-id
  const idsAttr = element.getAttribute("data-target-ids");
  const idAttr = element.getAttribute("data-target-id");
  const ids = idsAttr
    ? idsAttr.split(",").filter(Boolean)
    : idAttr
      ? [idAttr]
      : [];
  if (ids.length > 0) {
    return { node: $createTargetNode(ids) };
  }
  return { node: null };
}

export function $createTargetNode(targetIds: string[]): TargetNode {
  return $applyNodeReplacement(new TargetNode(targetIds));
}

export function $isTargetNode(
  node: LexicalNode | null | undefined,
): node is TargetNode {
  return node instanceof TargetNode;
}

export function createTarget(
  content: string,
  targetId?: string,
): TargetId | null {
  if (!content) {
    return null;
  }

  const normalizedContent = stripInlineMarkdown(content);

  const root = $getRoot();
  const textNodes = root.getAllTextNodes();
  if (textNodes.length === 0) {
    return null;
  }

  const ranges: Array<{ node: LexicalNode; start: number; end: number }> = [];
  let fullText = "";
  let lastTopLevel: LexicalNode | null = null;

  for (const node of textNodes) {
    if (!$isTextNode(node)) {
      continue;
    }
    const topLevel = node.getTopLevelElementOrThrow();
    if (lastTopLevel && topLevel !== lastTopLevel) {
      fullText += "\n";
    }
    const start = fullText.length;
    const text = node.getTextContent();
    fullText += text;
    const end = fullText.length;
    ranges.push({ node, start, end });
    lastTopLevel = topLevel;
  }

  let matchText = content;
  let matchIndex = fullText.indexOf(content);
  if (matchIndex === -1 && normalizedContent !== content) {
    matchText = normalizedContent;
    matchIndex = fullText.indexOf(normalizedContent);
  }
  if (matchIndex === -1) {
    return null;
  }
  if (fullText.indexOf(matchText, matchIndex + 1) !== -1) {
    return null;
  }

  const matchEnd = matchIndex + matchText.length;
  let startNode: LexicalNode | null = null;
  let endNode: LexicalNode | null = null;
  let startOffset = -1;
  let endOffset = -1;

  for (const range of ranges) {
    if (startNode === null && range.end > matchIndex) {
      startNode = range.node;
      startOffset = matchIndex - range.start;
    }
    if (range.end >= matchEnd) {
      endNode = range.node;
      endOffset = matchEnd - range.start;
      break;
    }
  }

  if (
    !startNode ||
    !endNode ||
    startOffset < 0 ||
    endOffset < 0 ||
    !$isTextNode(startNode) ||
    !$isTextNode(endNode)
  ) {
    return null;
  }

  const resolvedTargetId = targetId ?? crypto.randomUUID();
  const selection = $createRangeSelection();
  selection.setTextNodeRange(startNode, startOffset, endNode, endOffset);
  $setSelection(selection);
  $toggleTarget(resolvedTargetId);
  return resolvedTargetId;
}

function stripInlineMarkdown(input: string): string {
  let text = input;
  text = text.replace(/\\([\\`*_~[\]()!])/g, "$1");
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");
  return text;
}

export const TOGGLE_TARGET_COMMAND: LexicalCommand<string | null> =
  createCommand("TOGGLE_TARGET_COMMAND");

export function $toggleTarget(targetId: string | null): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return;
  }

  const nodes = selection.extract();

  if (targetId === null) {
    // Unwrap: remove TargetNode but keep children
    const processedTargets = new Set<string>();
    nodes.forEach((node) => {
      const parent = $findMatchingParent(node, $isTargetNode);
      if ($isTargetNode(parent)) {
        const key = parent.getKey();
        if (processedTargets.has(key)) {
          return;
        }
        processedTargets.add(key);
        const children = parent.getChildren();
        for (const child of children) {
          parent.insertBefore(child);
        }
        parent.remove();
      }
    });
    return;
  }

  // Wrap: create a new TargetNode or add ID to existing ones
  let targetNode: TargetNode | null = null;
  for (const node of nodes) {
    if (!node.isAttached()) {
      continue;
    }
    const existingTarget = $findMatchingParent(node, $isTargetNode);
    if ($isTargetNode(existingTarget)) {
      // Add the new targetId to the existing target
      existingTarget.addTargetId(targetId);
      continue;
    }
    if ($isElementNode(node)) {
      if (!node.isInline()) {
        continue;
      }
    }
    const prevSibling = node.getPreviousSibling();
    if ($isTargetNode(prevSibling) && prevSibling.is(targetNode)) {
      prevSibling.append(node);
      continue;
    }
    targetNode = $createTargetNode([targetId]);
    node.insertAfter(targetNode);
    targetNode.append(node);
  }
}

export function $removeTargetById(targetId: string): void {
  const root = $getRoot();
  const walk = (node: LexicalNode) => {
    if ($isTargetNode(node)) {
      const ids = node.getTargetIds().filter((id) => id !== targetId);
      if (ids.length === 0) {
        const children = node.getChildren();
        for (const child of children) {
          node.insertBefore(child);
        }
        node.remove();
      } else {
        node.setTargetIds(ids);
      }
      return;
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        walk(child);
      }
    }
  };
  walk(root);
}
