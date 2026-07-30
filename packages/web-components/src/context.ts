export {
  FLOATING_DELAY_GROUP_CONTEXT as LIT_FLOATING_DELAY_GROUP_CONTEXT,
  FLOATING_LIST_CONTEXT as LIT_FLOATING_LIST_CONTEXT,
  FLOATING_NODE_CONTEXT as LIT_FLOATING_NODE_CONTEXT,
  FLOATING_TREE_CONTEXT as LIT_FLOATING_TREE_CONTEXT,
} from '@floating-ui-plus/web';

/** @deprecated Context providers are now owned by Web FloatingContextScope. */
export type LitContextProvider = {
  key: string;
  getValue: () => unknown;
};
