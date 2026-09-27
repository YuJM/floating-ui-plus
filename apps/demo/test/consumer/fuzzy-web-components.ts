import {
  FloatingRootElement,
  createFuzzySearchSource,
  dismiss,
  flip,
  offset,
  size,
  shift,
  type FloatingQueryElement,
} from '@floating-ui-plus/web-components';

type Destination = {id: string; label: string};
const destinations: Destination[] = [{id: 'seoul', label: 'Seoul'}];
const source = createFuzzySearchSource(destinations, {keys: [{name: 'label'}]});

export function configureFuzzyQuery(query: FloatingQueryElement) {
  query.configure<Destination>({
    search: {source, getItemKey: (item) => item.id},
    getItemLabel: (item) => item.label,
  });
  return {FloatingRootElement, dismiss, flip, offset, size, shift};
}
