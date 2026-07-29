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
  let matchIndex: number | null = null;

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
        previousMatch = matchIndex ?? previousMatch;
        setTyping(false);
      }

      function onKeyDown(event: KeyboardEvent) {
        const current = getOptions();
        const list = current.listRef.current;

        const getMatchingIndex = (
          orderedList: Array<string | null>,
          value: string,
        ) => {
          const match = current.findMatch
            ? current.findMatch(orderedList, value)
            : orderedList.find((item) =>
                item
                  ?.toLocaleLowerCase()
                  .startsWith(value.toLocaleLowerCase()),
              );
          return match == null ? -1 : list.indexOf(match);
        };

        if (typed.length > 0 && typed[0] !== ' ') {
          if (getMatchingIndex(list, typed) === -1) {
            setTyping(false);
          } else if (event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
          }
        }

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

        if (!list.length) return;
        if (context.open && event.key !== ' ') {
          event.preventDefault();
          event.stopPropagation();
          setTyping(true);
        }

        const allowRapidFirstLetter = list.every((value) =>
          value
            ? value[0]?.toLocaleLowerCase() !==
              value[1]?.toLocaleLowerCase()
            : true,
        );
        if (
          allowRapidFirstLetter &&
          typed.toLocaleLowerCase() === event.key.toLocaleLowerCase()
        ) {
          typed = '';
          previousMatch = matchIndex ?? previousMatch;
        }

        typed += event.key;
        win.clearTimeout(timeout);
        timeout = win.setTimeout(reset, current.resetMs);

        const startIndex = (previousMatch || 0) + 1;
        const ordered = [
          ...list.slice(startIndex),
          ...list.slice(0, startIndex),
        ];
        const index = getMatchingIndex(ordered, typed);
        if (index >= 0) {
          matchIndex = index;
          current.onMatch?.(index);
        } else if (event.key !== ' ') {
          typed = '';
          setTyping(false);
        }
      }

      const cleanups = [
        addListener(reference, 'keydown', onKeyDown),
        addListener(floating, 'keydown', onKeyDown),
        context.events.on('openchange', ({open}) => {
          if (open) {
            win.clearTimeout(timeout);
            typed = '';
            matchIndex = null;
            previousMatch =
              getOptions().selectedIndex ?? getOptions().activeIndex ?? -1;
          }
        }),
        addListener(floating, 'keyup', (event) => {
          if (event.key === ' ') {
            setTyping(false);
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
