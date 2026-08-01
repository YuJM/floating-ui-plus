import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  createAsyncSearchSource,
  createCombobox,
  createComboboxStatusFormatter,
  createSearch,
} from '../src';

interface Item {
  id: string;
  label: string;
}

const alpha = {id: 'alpha', label: 'Alpha'};
const beta = {id: 'beta', label: 'Beta'};

const controllers: Array<{destroy(): void}> = [];

afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy());
  document.body.replaceChildren();
});

function setup() {
  const search = createSearch<Item>({
    items: [alpha, beta],
    getItemKey: (item) => item.id,
  });
  const onOpenChange = vi.fn();
  const onSelect = vi.fn();
  const combobox = createCombobox({
    search,
    getItemLabel: (item) => item.label,
    optionIdPrefix: 'test-option',
    onOpenChange,
    onSelect,
  });
  controllers.push(combobox, search);
  const input = document.createElement('input');
  document.body.append(input);
  combobox.bindInput(input);
  return {combobox, input, onOpenChange, onSelect, search};
}

describe('ComboboxController', () => {
  test('exposes the configured item label to renderer adapters', () => {
    const {combobox} = setup();

    expect(combobox.getItemLabel(alpha)).toBe('Alpha');
  });

  test('keeps the stable form value separate from the display label', () => {
    const {combobox} = setup();
    combobox.setOptions({getItemValue: (item) => `destination:${item.id}`});

    combobox.select(beta);

    expect(combobox.getItemValue(beta)).toBe('destination:beta');
    expect(combobox.snapshot.selectedValue).toBe('destination:beta');
  });

  test('binds focus, input, and IME composition to search state', () => {
    const {input, onOpenChange, search} = setup();

    input.dispatchEvent(new FocusEvent('focus'));
    input.dispatchEvent(new CompositionEvent('compositionstart'));
    input.value = 'ㅅ';
    input.dispatchEvent(new InputEvent('input'));

    expect(onOpenChange).toHaveBeenCalledWith(
      true,
      expect.any(FocusEvent),
      'focus',
    );
    expect(search.query).toBe('ㅅ');
    expect(search.composing).toBe(true);

    input.value = '서울';
    input.dispatchEvent(new CompositionEvent('compositionend'));
    expect(search.query).toBe('서울');
    expect(search.composing).toBe(false);
  });

  test('keeps active option ARIA in sync and selects it with Enter', () => {
    const {combobox, input, onOpenChange, onSelect, search} = setup();
    const options = [document.createElement('div'), document.createElement('div')];
    combobox.bindOption(options[0], alpha, 0);
    combobox.bindOption(options[1], beta, 1);
    combobox.setListElements(options);
    combobox.setActiveIndex(1);

    expect(input.getAttribute('aria-activedescendant')).toBe(
      'test-option-beta',
    );
    expect(options[1]?.dataset.active).toBe('true');

    input.dispatchEvent(
      new KeyboardEvent('keydown', {key: 'Enter', cancelable: true}),
    );

    expect(combobox.selectedItem).toBe(beta);
    expect(input.value).toBe('Beta');
    expect(search.query).toBe('Beta');
    expect(options[1]?.getAttribute('aria-selected')).toBe('true');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(KeyboardEvent),
      undefined,
    );
    expect(onSelect).toHaveBeenCalledWith(beta, expect.any(KeyboardEvent));
  });

  test('provides combobox role and virtual list navigation plugins', () => {
    const {combobox} = setup();
    expect(combobox.interactions({loop: true}).map((plugin) => plugin.name)).toEqual([
      'role',
      'listNavigation',
    ]);
    expect(combobox.getNavigationOptions({allowEscape: true})).toMatchObject({
      virtual: true,
      focusItemOnOpen: false,
      allowEscape: true,
    });
  });

  test('provides shared input and option props for framework adapters', () => {
    const {combobox, input, onSelect} = setup();
    const inputProps = combobox.getInputProps();
    expect(inputProps.value).toBe('');
    expect(inputProps['aria-busy']).toBe('false');
    expect(inputProps['data-loading']).toBe('false');
    expect(inputProps.onInput).toBe(combobox.handleInput);
    expect(inputProps.onKeydown).toBe(combobox.handleKeyDown);

    combobox.setActiveIndex(1);
    const optionProps = combobox.getOptionProps(beta, 1);
    expect(optionProps).toMatchObject({
      id: 'test-option-beta',
      role: 'option',
      'data-active': 'true',
      'aria-selected': 'false',
    });
    const mouseDown = new MouseEvent('mousedown', {cancelable: true});
    optionProps.onMousedown(mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);

    optionProps.onClick(new MouseEvent('click'));
    expect(input.value).toBe('Beta');
    expect(onSelect).toHaveBeenCalledWith(beta, expect.any(MouseEvent));
  });

  test('keeps loading semantics on the bound input in sync with search state', () => {
    const {combobox, input, search} = setup();

    search.setControlledState({items: [alpha], loading: true});
    expect(combobox.getInputProps()['aria-busy']).toBe('true');
    expect(input.getAttribute('aria-busy')).toBe('true');
    expect(input.dataset.loading).toBe('true');

    search.setControlledState({items: [alpha], loading: false});
    expect(input.getAttribute('aria-busy')).toBe('false');
    expect(input.dataset.loading).toBe('false');
  });

  test('activates an external query preset and restores input focus', () => {
    const {combobox, input, onOpenChange, search} = setup();
    const event = new MouseEvent('click');

    combobox.activateQuery('alpah', event);

    expect(input.value).toBe('alpah');
    expect(search.query).toBe('alpah');
    expect(document.activeElement).toBe(input);
    expect(onOpenChange).toHaveBeenCalledWith(true, event, undefined);
  });

  test('shares status copy and query-trigger props without owning markup', () => {
    const {combobox, input} = setup();
    const status = createComboboxStatusFormatter<Item>({
      closed: 'Suggestions closed',
      selected: (item) => `${item.label} selected`,
      idle: 'Start searching',
      loading: 'Searching',
      error: 'Search failed',
      empty: 'No results',
      results: ({search}) => `${search.items.length} results`,
    });
    const props = combobox.getQueryTriggerProps('beta');
    const mouseDown = new MouseEvent('mousedown', {cancelable: true});

    expect(status({...combobox.snapshot, open: false})).toBe(
      'Suggestions closed',
    );
    combobox.handleFocus(new FocusEvent('focus'));
    expect(status({...combobox.snapshot, open: true})).toBe('2 results');

    combobox.search.setControlledState({items: [alpha, beta], loading: true});
    expect(combobox.search.phase).toBe('results');
    expect(status({...combobox.snapshot, open: true})).toBe('Searching');
    combobox.search.setControlledState({items: [alpha, beta]});

    props.onMousedown(mouseDown);
    props.onClick(new MouseEvent('click'));
    expect(mouseDown.defaultPrevented).toBe(true);
    expect(input.value).toBe('beta');
    expect(document.activeElement).toBe(input);

    combobox.select(beta);
    expect(status({...combobox.snapshot, open: false})).toBe('Beta selected');
  });

  test('keeps non-Latin item keys distinct in option ids', () => {
    const search = createSearch({
      items: [
        {id: '北京', label: 'Beijing'},
        {id: '東京', label: 'Tokyo'},
      ],
      getItemKey: (item) => item.id,
    });
    const combobox = createCombobox({
      search,
      getItemLabel: (item) => item.label,
      optionIdPrefix: 'unicode-option',
    });
    controllers.push(combobox, search);

    expect(combobox.getItemId(0)).not.toBe(combobox.getItemId(1));
  });

  test('runs the initial source refresh when the input is bound', async () => {
    const request = vi.fn(async () => ({items: [alpha]}));
    const search = createSearch({
      source: createAsyncSearchSource({search: request}),
      getItemKey: (item: Item) => item.id,
    });
    const combobox = createCombobox({
      search,
      getItemLabel: (item) => item.label,
    });
    controllers.push(combobox, search);

    combobox.bindInput(document.createElement('input'));
    await Promise.resolve();

    expect(request).toHaveBeenCalledOnce();
    expect(search.items).toEqual([alpha]);
  });
});
