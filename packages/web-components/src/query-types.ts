import type {
  QuerySemantics,
  QueryStatusContext,
  QueryStatusFormatter,
  QueryStatusMessages,
  QueryStatusText,
  SearchController,
  SearchOptions,
} from '@floating-ui-plus/web';
import {createQueryStatusFormatter} from '@floating-ui-plus/web';

export type FloatingQueryStatusContext<T> = QueryStatusContext<T>;
export type FloatingQueryStatusFormatter<T> = QueryStatusFormatter<T>;
export type FloatingQueryStatusText<T> = QueryStatusText<T>;
export type FloatingQueryStatusMessages<T> = QueryStatusMessages<T>;
export const createFloatingQueryStatusFormatter = createQueryStatusFormatter;

export type FloatingQuerySearchConfiguration<T> =
  | SearchController<T>
  | SearchOptions<T>;

/** Configuration for the non-form-associated `<floating-query>` element. */
export interface FloatingQueryConfiguration<T> {
  search: FloatingQuerySearchConfiguration<T>;
  getItemLabel(item: T): string;
  getItemKey?: ((item: T) => string | number) | undefined;
  /** Defaults to ARIA combobox semantics for editable result queries. */
  semantics?: QuerySemantics | undefined;
  status?:
    | FloatingQueryStatusFormatter<T>
    | FloatingQueryStatusMessages<T>
    | undefined;
}
