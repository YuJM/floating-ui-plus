import {addListener, cleanupAll} from '../events';
import type {FloatingPlugin, ValueOrGetter} from '../types';
import type {Ref} from '../utils/common';
import {getValue} from '../utils/common';

export interface TypeaheadOptions {
  listRef: Ref<Array<string | null>>;
  activeIndex: number | null;
  onMatch?: ((index: number) => void) | undefined;
  onTypingChange?: ((typing: boolean) => void) | undefined;
  enabled?: boolean | undefined;
  findMatch?:
    | null
    | ((
        list: Array<string | null>,
        typedString: string,
      ) => string | null | undefined)
    | undefined;
  resetMs?: number | undefined;
  ignoreKeys?: Array<string> | undefined;
  selectedIndex?: number | null | undefined;
}

export function typeahead(
  options: ValueOrGetter<TypeaheadOptions>,
): FloatingPlugin {
  let typed = '';
  let timeout = -1;
  let previousMatch = -1;

  return {
    name: 'typeahead',
    connect(context) {
      const reference = context.elements.domReference;
      const floating = context.elements.floating;
      const win =
        reference?.ownerDocument.defaultView ||
        floating?.ownerDocument.defaultView ||
        window;

      const getOptions = () => ({
        enabled: true,
        findMatch: null,
        resetMs: 750,
        ignoreKeys: [] as Array<string>,
        selectedIndex: null,
        ...getValue(options),
      });

      function setTyping(value: boolean) {
        if (Boolean(context.data.typing) === value) return;
        context.data.typing = value;
        getOptions().onTypingChange?.(value);
      }

      function reset() {
        typed = '';
        setTyping(false);
      }

      function onKeyDown(event: KeyboardEvent) {
        const current = getOptions();
        if (
          !current.enabled ||
          event.defaultPrevented ||
          (current.ignoreKeys || []).includes(event.key) ||
          event.key.length !== 1 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        ) {
          return;
        }

        const list = current.listRef.current;
        if (!list.length) return;
        if (context.open && event.key !== ' ') {
          event.preventDefault();
          event.stopPropagation();
          setTyping(true);
        }

        win.clearTimeout(timeout);
        typed += event.key;
        const lower = typed.toLocaleLowerCase();
        const start =
          previousMatch >= 0
            ? [
                ...list.slice(previousMatch + 1),
                ...list.slice(0, previousMatch + 1),
              ]
            : list;
        const match = current.findMatch
          ? current.findMatch(start, typed)
          : start.find((value) => value?.toLocaleLowerCase().startsWith(lower));
        const index = match == null ? -1 : list.indexOf(match);
        if (index >= 0) {
          previousMatch = index;
          current.onMatch?.(index);
        }
        timeout = win.setTimeout(reset, current.resetMs);
      }

      const cleanups = [
        addListener(reference, 'keydown', onKeyDown),
        addListener(floating, 'keydown', onKeyDown),
        context.events.on('openchange', ({open}) => {
          if (open) {
            win.clearTimeout(timeout);
            typed = '';
            previousMatch =
              getOptions().selectedIndex ?? getOptions().activeIndex ?? -1;
          }
        }),
      ];

      return () => {
        win.clearTimeout(timeout);
        reset();
        cleanupAll(cleanups)();
      };
    },
  };
}
