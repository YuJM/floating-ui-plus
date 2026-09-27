import {
  FloatingContent,
  FloatingList,
  FloatingListItem,
  FloatingReference,
  FloatingResults,
  FloatingRoot,
  autoUpdate,
  createFuzzySearchSource,
  dismiss,
  flip,
  offset,
  size,
  shift,
  useQuery,
  useSearch,
} from '@floating-ui-plus/vue';

type Destination = {id: string; label: string};
const destinations: Destination[] = [{id: 'seoul', label: 'Seoul'}];
const source = createFuzzySearchSource(destinations, {keys: [{name: 'label'}]});

export function useFuzzyQuery() {
  const search = useSearch<Destination>({
    source,
    getItemKey: (item) => item.id,
  });
  const query = useQuery<Destination>({
    search,
    getItemLabel: (item) => item.label,
  });
  return {
    query,
    FloatingContent,
    FloatingList,
    FloatingListItem,
    FloatingReference,
    FloatingResults,
    FloatingRoot,
    autoUpdate,
    dismiss,
    flip,
    offset,
    size,
    shift,
  };
}
