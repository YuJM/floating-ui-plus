import type {
  ComboboxSnapshot,
  SearchController,
  SearchOptions,
} from '@floating-ui-plus/web';

export interface FloatingComboboxStatusContext<T>
  extends ComboboxSnapshot<T> {
  open: boolean;
}

export type FloatingComboboxStatusFormatter<T> = (
  context: FloatingComboboxStatusContext<T>,
) => string;

export type FloatingComboboxStatusText<T> =
  | string
  | FloatingComboboxStatusFormatter<T>;

export interface FloatingComboboxStatusMessages<T> {
  closed: FloatingComboboxStatusText<T>;
  selected?:
    | string
    | ((item: T, context: FloatingComboboxStatusContext<T>) => string)
    | undefined;
  idle: FloatingComboboxStatusText<T>;
  loading: FloatingComboboxStatusText<T>;
  error: FloatingComboboxStatusText<T>;
  empty: FloatingComboboxStatusText<T>;
  results: FloatingComboboxStatusText<T>;
}

function resolveStatusText<T>(
  value: FloatingComboboxStatusText<T>,
  context: FloatingComboboxStatusContext<T>,
) {
  return typeof value === 'function' ? value(context) : value;
}

export function createFloatingComboboxStatusFormatter<T>(
  messages: FloatingComboboxStatusMessages<T>,
): FloatingComboboxStatusFormatter<T> {
  return (context) => {
    if (!context.open) {
      if (context.selectedItem != null && messages.selected) {
        return typeof messages.selected === 'function'
          ? messages.selected(context.selectedItem, context)
          : messages.selected;
      }
      return resolveStatusText(messages.closed, context);
    }
    return resolveStatusText(messages[context.search.phase], context);
  };
}

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
