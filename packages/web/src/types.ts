import type {
  ComputePositionConfig,
  MiddlewareData,
  Placement,
  ReferenceElement,
  Strategy,
  VirtualElement,
} from '@floating-ui/dom';

export type OpenChangeReason =
  | 'outside-press'
  | 'escape-key'
  | 'ancestor-scroll'
  | 'reference-press'
  | 'click'
  | 'hover'
  | 'focus'
  | 'focus-out'
  | 'list-navigation'
  | 'safe-polygon';

export type Delay =
  | number
  | Partial<{open: number | undefined; close: number | undefined}>;

export type ValueOrGetter<T> = T | (() => T);

export type WhileElementsMounted = (
  reference: ReferenceElement,
  floating: HTMLElement,
  update: () => void,
) => () => void;

export interface FloatingOptions
  extends Omit<Partial<ComputePositionConfig>, 'middleware'> {
  open?: boolean | undefined;
  onOpenChange?:
    | ((open: boolean, event?: Event, reason?: OpenChangeReason) => void)
    | undefined;
  middleware?: ComputePositionConfig['middleware'] | undefined;
  whileElementsMounted?: WhileElementsMounted | undefined;
  transform?: boolean | undefined;
}

export type FloatingOptionsSource = FloatingOptions | (() => FloatingOptions);

export interface FloatingElements {
  reference: ReferenceElement | null;
  domReference: Element | null;
  floating: HTMLElement | null;
}

export interface FloatingPosition {
  x: number;
  y: number;
  strategy: Strategy;
  placement: Placement;
  middlewareData: MiddlewareData;
  isPositioned: boolean;
}

export type FloatingStyles = Partial<CSSStyleDeclaration> & {
  position: Strategy;
  left: string;
  top: string;
  transform?: string;
  willChange?: string;
};

export interface FloatingOpenChangeEvent {
  open: boolean;
  event?: Event | undefined;
  reason?: OpenChangeReason | undefined;
  nested: boolean;
}

export interface FloatingEvents {
  emit(event: 'openchange', value: FloatingOpenChangeEvent): void;
  emit(event: 'positionchange', value: FloatingPosition): void;
  on(
    event: 'openchange',
    listener: (value: FloatingOpenChangeEvent) => void,
  ): () => void;
  on(
    event: 'positionchange',
    listener: (value: FloatingPosition) => void,
  ): () => void;
}

export interface FloatingData {
  openEvent?: Event | undefined;
  typing?: boolean | undefined;
  pointerType?: string | undefined;
  [key: string]: unknown;
}

export type FloatingElementKey = 'reference' | 'floating' | 'item';

export interface FloatingAttributes {
  reference?: Record<string, string | boolean | null | undefined> | undefined;
  floating?: Record<string, string | boolean | null | undefined> | undefined;
  item?:
    | ((
        state: ItemState,
      ) => Record<string, string | boolean | null | undefined>)
    | Record<string, string | boolean | null | undefined>
    | undefined;
}

export interface ItemState {
  active?: boolean | undefined;
  selected?: boolean | undefined;
  index?: number | undefined;
}

export interface FloatingContext {
  readonly open: boolean;
  readonly options: FloatingOptions;
  readonly elements: FloatingElements;
  readonly position: FloatingPosition;
  readonly data: FloatingData;
  readonly events: FloatingEvents;
  readonly floatingId: string;
  readonly attributes: FloatingAttributes;
  readonly nested: boolean;
  onOpenChange(open: boolean, event?: Event, reason?: OpenChangeReason): void;
  setPositionReference(reference: ReferenceElement | null): void;
  update(): Promise<void>;
}

export interface FloatingPlugin {
  readonly name?: string | undefined;
  connect(context: FloatingContext): void | (() => void);
  update?(context: FloatingContext): void;
}

export interface FloatingController {
  readonly context: FloatingContext;
  readonly elements: FloatingElements;
  readonly position: FloatingPosition;
  readonly floatingStyles: FloatingStyles;
  readonly plugins: readonly FloatingPlugin[];
  pipe(...plugins: FloatingPlugin[]): FloatingController;
  setReference(reference: Element | VirtualElement | null): void;
  setPositionReference(reference: ReferenceElement | null): void;
  setFloating(floating: HTMLElement | null): void;
  connect(): void;
  disconnect(): void;
  refresh(): void;
  update(): Promise<void>;
  destroy(): void;
}

export type {ReferenceElement, VirtualElement};
