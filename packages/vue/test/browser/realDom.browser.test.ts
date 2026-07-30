import {render} from '@testing-library/vue';
import {defineComponent, ref} from 'vue';

import {autoUpdate, offset, useFloating} from '../../src';

test('positions a Vue floating element in a real browser', async () => {
  const App = defineComponent({
    setup() {
      const reference = ref<HTMLElement | null>(null);
      const floating = ref<HTMLElement | null>(null);
      const position = useFloating(reference, floating, {
        middleware: [offset(8)],
        whileElementsMounted: autoUpdate,
      });
      return {
        floating,
        floatingStyles: position.floatingStyles,
        reference,
      };
    },
    template: `
      <button ref="reference" style="position:fixed;left:40px;top:30px;width:80px;height:20px">
        Anchor
      </button>
      <div ref="floating" data-testid="floating" :style="floatingStyles">
        Floating
      </div>
    `,
  });

  const {getByTestId} = render(App);
  await expect
    .poll(() => getByTestId('floating').getBoundingClientRect().top)
    .toBe(58);
});
