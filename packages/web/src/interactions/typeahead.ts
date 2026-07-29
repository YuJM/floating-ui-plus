import {addListener, cleanupAll} from '../events';
import type {FloatingPlugin, ValueOrGetter} from '../types';
import type {Ref} from '../utils/common';
import {enqueueMicrotask, getValue} from '../utils/common';
import {createFuzzyMatcher, normalizeSearchText} from '../fuzzy';

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
  let composing = false;
  let compositionKeyToIgnore: string | null = null;
  const defaultFindMatch = createFuzzyMatcher();

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

      function getMatchingIndex(
        orderedList: Array<string | null>,
        value: string,
      ) {
        const current = getOptions();
        const list = current.listRef.current;
        const normalizedValue = normalizeSearchText(value);
        const match = current.findMatch
          ? current.findMatch(orderedList, normalizedValue)
          : defaultFindMatch(orderedList, normalizedValue);
        return match == null ? -1 : list.indexOf(match);
      }

      function processText(value: string, event?: KeyboardEvent) {
        const current = getOptions();
        const list = current.listRef.current;
        const normalizedInput = value.normalize('NFKC');
        if (!normalizedInput || !list.length) return;
        if (typed.length > 0 && typed[0] !== ' ') {
          if (getMatchingIndex(list, typed) === -1) {
            setTyping(false);
          } else if (normalizedInput === ' ') {
            event?.preventDefault();
            event?.stopPropagation();
          }
        }

        if (context.open && normalizedInput !== ' ') {
          event?.preventDefault();
          event?.stopPropagation();
          setTyping(true);
        }

        const allowRapidFirstLetter = list.every((value) =>
          value
            ? normalizeSearchText(value[0] ?? '') !==
              normalizeSearchText(value[1] ?? '')
            : true,
        );
        if (
          allowRapidFirstLetter &&
          normalizedInput.length === 1 &&
          normalizeSearchText(typed) === normalizeSearchText(normalizedInput)
        ) {
          typed = '';
          previousMatch = matchIndex ?? previousMatch;
        }

        typed += normalizedInput;
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
        } else if (normalizedInput !== ' ') {
          typed = '';
          setTyping(false);
        }
      }

      function onKeyDown(event: KeyboardEvent) {
        const current = getOptions();
        if (
          !current.enabled ||
          event.defaultPrevented ||
          composing ||
          event.isComposing ||
          event.keyCode === 229 ||
          (current.ignoreKeys || []).includes(event.key) ||
          event.key.length !== 1 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        ) {
          return;
        }
        if (
          compositionKeyToIgnore &&
          normalizeSearchText(event.key) ===
            normalizeSearchText(compositionKeyToIgnore)
        ) {
          compositionKeyToIgnore = null;
          return;
        }
        processText(event.key, event);
      }

      function onCompositionStart() {
        if (!getOptions().enabled) return;
        composing = true;
        compositionKeyToIgnore = null;
        if (context.open) setTyping(true);
      }

      function onCompositionEnd(event: CompositionEvent) {
        if (!composing) return;
        composing = false;
        const value = event.data?.normalize('NFKC') ?? '';
        if (!value) {
          setTyping(Boolean(typed));
          return;
        }
        compositionKeyToIgnore = value;
        enqueueMicrotask(() => {
          compositionKeyToIgnore = null;
        });
        processText(value);
      }

      const cleanups = [
        addListener(reference, 'keydown', onKeyDown),
        addListener(floating, 'keydown', onKeyDown),
        addListener(reference, 'compositionstart', onCompositionStart),
        addListener(floating, 'compositionstart', onCompositionStart),
        addListener(reference, 'compositionend', onCompositionEnd),
        addListener(floating, 'compositionend', onCompositionEnd),
        context.events.on('openchange', ({open}) => {
          if (open) {
            win.clearTimeout(timeout);
            typed = '';
            matchIndex = null;
            composing = false;
            compositionKeyToIgnore = null;
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
        composing = false;
        compositionKeyToIgnore = null;
        reset();
        cleanupAll(cleanups)();
      };
    },
  };
}
