export interface TreeNodeLike<TContext = {open?: boolean}> {
  id: string;
  parentId?: string | null | undefined;
  context?: TContext | null | undefined;
}

export function getNodeChildren<
  TContext extends {open?: boolean},
  TNode extends TreeNodeLike<TContext>,
>(nodes: TNode[], id: string | undefined, onlyOpenChildren = true): TNode[] {
  const children = nodes.filter(
    (node) => node.parentId === id && (!onlyOpenChildren || node.context?.open),
  );
  return children.flatMap((child) => [
    child,
    ...getNodeChildren<TContext, TNode>(nodes, child.id, onlyOpenChildren),
  ]);
}

export function getNodeAncestors<TNode extends TreeNodeLike>(
  nodes: TNode[],
  id: string | undefined,
) {
  const ancestors: TNode[] = [];
  let parentId = nodes.find((node) => node.id === id)?.parentId;
  while (parentId) {
    const parent = nodes.find((node) => node.id === parentId);
    if (!parent) break;
    ancestors.push(parent);
    parentId = parent.parentId;
  }
  return ancestors;
}

export function getDeepestNode<TNode extends TreeNodeLike>(
  nodes: TNode[],
  id: string | undefined,
) {
  let deepest: TNode | undefined;
  const visit = (parentId: string | undefined, depth: number) => {
    getNodeChildren(nodes, parentId).forEach((node) => {
      if (!deepest || depth >= getNodeAncestors(nodes, deepest.id).length) {
        deepest = node;
      }
      visit(node.id, depth + 1);
    });
  };
  visit(id, 0);
  return deepest;
}
