import type {
  ComboboxStatusContext,
  ComboboxStatusFormatter,
  ComboboxStatusMessages,
  ComboboxStatusText,
  SearchController,
  SearchOptions,
} from '@floating-ui-plus/web';
import {createComboboxStatusFormatter} from '@floating-ui-plus/web';

export type FloatingComboboxStatusContext<T> = ComboboxStatusContext<T>;
export type FloatingComboboxStatusFormatter<T> = ComboboxStatusFormatter<T>;
export type FloatingComboboxStatusText<T> = ComboboxStatusText<T>;
export type FloatingComboboxStatusMessages<T> = ComboboxStatusMessages<T>;
export const createFloatingComboboxStatusFormatter =
  createComboboxStatusFormatter;

export type FloatingComboboxSearchConfiguration<T> =
  | SearchController<T>
  | SearchOptions<T>;

export interface FloatingComboboxConfiguration<T> {
  search: FloatingComboboxSearchConfiguration<T>;
  getItemLabel(item: T): string;
  getItemKey?: ((item: T) => string | number) | undefined;
  getItemValue?: ((item: T) => string) | undefined;
  selectedItem?: T | null | undefined;
  status?:
    | FloatingComboboxStatusFormatter<T>
    | FloatingComboboxStatusMessages<T>
    | undefined;
}
