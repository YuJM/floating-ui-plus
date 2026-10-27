import {
  createQuery, createSearch, listNavigation,
  type FloatingQueryElement, type ExternalQueryOptions, type ListNavigationPlugin,
} from '@floating-ui-plus/web-components';

export function connectEditor(element: FloatingQueryElement, editor: HTMLElement, event: KeyboardEvent) {
  const state: ExternalQueryOptions = {composing: event.isComposing};
  element.externalInput = editor;
  element.setExternalQuery('제목', state);
  const search = createSearch({
    items: [{id: 'heading', label: '제목'}], getItemKey: (item) => item.id,
  });
  const query = createQuery({search, getItemLabel: (item) => item.label});
  const unbind = query.bindExternalInput(editor);
  const navigation: ListNavigationPlugin = listNavigation({
    listRef: query.listRef, activeIndex: null, keyboardHandling: 'manual',
  });
  query.setExternalQuery('제목', state);
  unbind();
  return element.handleKeyDown(event) || navigation.handleKeyDown(event);
}
