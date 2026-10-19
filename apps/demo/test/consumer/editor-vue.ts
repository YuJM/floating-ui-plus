import {useQuery, useSearch, type ExternalQueryOptions, type ListNavigationPlugin} from '@floating-ui-plus/vue';

export function useEditorQuery(editor: HTMLElement, event: KeyboardEvent) {
  const search = useSearch({
    items: [{id: 'heading', label: '제목'}], getItemKey: (item) => item.id,
  });
  const query = useQuery({search, getItemLabel: (item) => item.label});
  const state: ExternalQueryOptions = {composing: true};
  query.setExternalQuery('제목', state);
  const unbind = query.bindExternalInput(editor);
  const navigation: ListNavigationPlugin = query.controller.navigationPlugin({keyboardHandling: 'manual'});
  unbind();
  return navigation.handleKeyDown(event) || query.handleKeyDown(event);
}
