import {
	ElementNode,
	$applyNodeReplacement,
	$getSelection,
	$isRangeSelection,
	$isElementNode,
	$createTextNode,
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
} from 'lexical';
import { addClassNamesToElement, $findMatchingParent } from '@lexical/utils';

export type SerializedTargetNode = Spread<
	{ targetId: string },
	SerializedElementNode
>;

export class TargetNode extends ElementNode {
	__targetId: string;

	static getType(): string {
		return 'target';
	}

	static clone(node: TargetNode): TargetNode {
		return new TargetNode(node.__targetId, node.__key);
	}

	constructor(targetId: string, key?: NodeKey) {
		super(key);
		this.__targetId = targetId;
	}

	createDOM(config: EditorConfig): HTMLElement {
		const element = document.createElement('mark');
		element.setAttribute('data-target-id', this.__targetId);
		addClassNamesToElement(element, config.theme.target);
		return element;
	}

	updateDOM(prevNode: TargetNode, element: HTMLElement): boolean {
		if (prevNode.__targetId !== this.__targetId) {
			element.setAttribute('data-target-id', this.__targetId);
		}
		return false;
	}

	static importDOM(): DOMConversionMap | null {
		return {
			mark: (node: Node) => {
				const element = node as HTMLElement;
				if (!element.hasAttribute('data-target-id')) {
					return null;
				}
				return {
					conversion: $convertTargetElement,
					priority: 1,
				};
			},
		};
	}

	static importJSON(serializedNode: SerializedTargetNode): TargetNode {
		return $createTargetNode(serializedNode.targetId).updateFromJSON(
			serializedNode,
		);
	}

	updateFromJSON(
		serializedNode: LexicalUpdateJSON<SerializedTargetNode>,
	): this {
		return super.updateFromJSON(serializedNode).setTargetId(
			serializedNode.targetId,
		);
	}

	exportJSON(): SerializedTargetNode {
		return {
			...super.exportJSON(),
			targetId: this.getTargetId(),
		};
	}

	getTargetId(): string {
		return this.getLatest().__targetId;
	}

	setTargetId(targetId: string): this {
		const writable = this.getWritable();
		writable.__targetId = targetId;
		return writable;
	}

	insertNewAfter(_: RangeSelection, restoreSelection?: boolean): null | ElementNode {
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

	extractWithChild(
		child: LexicalNode,
		selection: RangeSelection,
	): boolean {
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
	const targetId = element.getAttribute('data-target-id');
	if (targetId) {
		return { node: $createTargetNode(targetId) };
	}
	return { node: null };
}

export function $createTargetNode(targetId: string): TargetNode {
	return $applyNodeReplacement(new TargetNode(targetId));
}

export function $isTargetNode(
	node: LexicalNode | null | undefined,
): node is TargetNode {
	return node instanceof TargetNode;
}

export const TOGGLE_TARGET_COMMAND: LexicalCommand<string | null> =
	createCommand('TOGGLE_TARGET_COMMAND');

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

	// Wrap: create a new TargetNode around the selection
	let targetNode: TargetNode | null = null;
	for (const node of nodes) {
		if (!node.isAttached()) {
			continue;
		}
		const existingTarget = $findMatchingParent(node, $isTargetNode);
		if (existingTarget) {
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
		targetNode = $createTargetNode(targetId);
		node.insertAfter(targetNode);
		targetNode.append(node);
	}
}
