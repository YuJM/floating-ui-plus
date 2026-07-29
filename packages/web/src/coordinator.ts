import {
  FLOATING_DELAY_GROUP_CONTEXT,
  FLOATING_LIST_CONTEXT,
  FLOATING_NODE_CONTEXT,
  FLOATING_TREE_CONTEXT,
} from './constants';
import {FloatingContextScope} from './contextScope';
import {DelayGroup, type DelayGroupOptions} from './delayGroup';
import {FloatingList} from './list';
import {FloatingTree} from './tree';
import type {FloatingController} from './types';

export interface FloatingNodeOptions {
  tree?: FloatingTree | undefined;
  id?: string | undefined;
  parentId?: string | null | undefined;
}

export interface FloatingDelayGroupOptions extends DelayGroupOptions {
  group?: DelayGroup | undefined;
  id?: string | undefined;
}

type CoordinatedController = Pick<FloatingController, 'context'>;

export class FloatingCoordinator {
  readonly scope: FloatingContextScope;
  #controller: CoordinatedController;
  #list = new FloatingList<unknown>();
  #nodeOptions: FloatingNodeOptions | null = null;
  #nodeTree: FloatingTree | null = null;
  #nodeCleanup: (() => void) | null = null;
  #delayGroupOptions: FloatingDelayGroupOptions | null = null;
  #delayGroup: DelayGroup | null = null;
  #delayGroupCleanup: (() => void) | null = null;
  #ownsDelayGroup = false;
  #connected = false;

  constructor(
    controller: CoordinatedController,
    scope = new FloatingContextScope(),
  ) {
    this.#controller = controller;
    this.scope = scope;
    this.scope.provide(FLOATING_LIST_CONTEXT, () => this.#list);
    this.scope.provide(
      FLOATING_TREE_CONTEXT,
      () => this.#nodeTree ?? undefined,
    );
    this.scope.provide(
      FLOATING_NODE_CONTEXT,
      () => this.#controller.context.data.nodeId,
    );
    this.scope.provide(
      FLOATING_DELAY_GROUP_CONTEXT,
      () => this.#delayGroup ?? undefined,
    );
  }

  get list() {
    return this.#list;
  }

  node(options: FloatingNodeOptions | null = {}) {
    this.#nodeOptions = options;
    if (this.#connected) this.#connectNode();
  }

  withList(list: FloatingList<unknown> = new FloatingList()) {
    this.#list = list;
  }

  delayGroup(options: FloatingDelayGroupOptions | null = {}) {
    this.#delayGroupOptions = options;
    if (this.#connected) this.#connectDelayGroup();
  }

  setParentScope(parent: FloatingContextScope | null) {
    if (this.scope.parent === parent) return;
    this.scope.setParent(parent);
    if (this.#connected) {
      this.#connectNode();
      this.#connectDelayGroup();
    }
  }

  connect() {
    if (this.#connected) return;
    this.#connected = true;
    this.#connectNode();
    this.#connectDelayGroup();
  }

  refresh() {
    if (!this.#connected) return;
  }

  disconnect() {
    if (!this.#connected) return;
    this.#connected = false;
    this.#disconnectDelayGroup();
    this.#nodeCleanup?.();
    this.#nodeCleanup = null;
    this.#nodeTree = null;
  }

  destroy() {
    this.disconnect();
    this.scope.destroy();
  }

  #connectNode() {
    this.#nodeCleanup?.();
    this.#nodeCleanup = null;
    this.#nodeTree = null;
    if (!this.#nodeOptions) return;

    const tree =
      this.#nodeOptions.tree ??
      this.scope.parent?.consume<FloatingTree>(FLOATING_TREE_CONTEXT) ??
      new FloatingTree();
    const inheritedParentId = this.scope.parent?.consume<string>(
      FLOATING_NODE_CONTEXT,
    );
    const registration = tree.register(this.#controller, {
      ...(this.#nodeOptions.id ? {id: this.#nodeOptions.id} : {}),
      parentId:
        this.#nodeOptions.parentId !== undefined
          ? this.#nodeOptions.parentId
          : inheritedParentId ?? null,
    });
    this.#nodeTree = tree;
    this.#nodeCleanup = registration.unregister;
  }

  #connectDelayGroup() {
    this.#disconnectDelayGroup();
    if (!this.#delayGroupOptions) return;

    const inheritedGroup = this.scope.parent?.consume<DelayGroup>(
      FLOATING_DELAY_GROUP_CONTEXT,
    );
    const group =
      this.#delayGroupOptions.group ??
      inheritedGroup ??
      new DelayGroup(this.#delayGroupOptions);
    const id =
      this.#delayGroupOptions.id ?? this.#controller.context.floatingId;
    this.#ownsDelayGroup =
      this.#delayGroupOptions.group == null && inheritedGroup == null;
    this.#delayGroup = group;
    this.#controller.context.data.delayGroup = group;
    this.#controller.context.data.delayGroupId = id;

    const sync = (open: boolean) => {
      open ? group.open(id) : group.close(id);
    };
    sync(this.#controller.context.open);
    const unsubscribe = this.#controller.context.events.on(
      'openchange',
      ({open}) => sync(open),
    );
    this.#delayGroupCleanup = () => {
      unsubscribe();
      group.close(id);
      if (this.#ownsDelayGroup) group.destroy();
      delete this.#controller.context.data.delayGroup;
      delete this.#controller.context.data.delayGroupId;
    };
  }

  #disconnectDelayGroup() {
    this.#delayGroupCleanup?.();
    this.#delayGroupCleanup = null;
    this.#delayGroup = null;
    this.#ownsDelayGroup = false;
  }
}
