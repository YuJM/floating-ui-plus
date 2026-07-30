import {
  c,
  type as atomicoType,
  useContext,
  useEffect,
  useHost,
  useLayoutEffect,
} from 'atomico';
import {
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  getContextArrowStyles,
  registerFloatingArrow,
} from '@floating-ui-plus/web';

import {floatingComponentContext} from './component-context';

const arrowStyles = `
  :host {
    display: block;
    position: absolute;
    pointer-events: none;
  }

  svg,
  ::slotted(svg) {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
`;

interface FloatingArrowHost extends HTMLElement {
  width: number;
  height: number;
  staticOffset: string | number | null;
  rotation: 'auto' | 'none';
}

const FloatingArrowBase = c(
  () => {
    const host = useHost<FloatingArrowHost>().current;
    const root = useContext(floatingComponentContext).root;

    const syncPosition = () => {
      if (!root) return;
      Object.assign(
        host.style,
        getContextArrowStyles(root.controller.context, {
          element: host,
          staticOffset: host.staticOffset ?? -host.height,
          rotate: host.rotation !== 'none',
        }),
      );
    };

    useEffect(() => {
      host.setAttribute(FLOATING_UI_PLUS_ARROW_ATTRIBUTE, '');
      host.setAttribute('aria-hidden', 'true');
    }, []);

    useLayoutEffect(() => {
      host.setAttribute(
        FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
        String(host.height),
      );
      syncPosition();
    });

    useEffect(() => {
      if (!root) return;
      const unregister = registerFloatingArrow(root.controller.context, {
        element: host,
        height: host.height,
      });
      const unsubscribe = root.controller.context.events.on(
        'positionchange',
        syncPosition,
      );
      syncPosition();
      return () => {
        unregister();
        unsubscribe();
      };
    }, [root, host.height, host.staticOffset, host.rotation]);

    return (
      <host shadowDom>
        <style>{arrowStyles}</style>
        <slot>
          <svg
            width={host.width}
            height={host.height}
            viewBox={`0 0 ${host.width} ${host.height}`}
            part="svg"
          >
            <path
              part="path"
              d={`M0 ${host.height}L${host.width / 2} 0L${host.width} ${
                host.height
              }Z`}
            />
          </svg>
        </slot>
      </host>
    );
  },
  {
    props: {
      width: {type: Number, value: (): number => 14},
      height: {type: Number, value: (): number => 7},
      staticOffset: {
        type: atomicoType<string | number | null>(String),
        value: (): string | number | null => null,
        attr: 'static-offset',
      },
      rotation: {
        type: atomicoType<'auto' | 'none'>(String),
        value: (): 'auto' | 'none' => 'auto',
      },
    },
  },
);

export class FloatingArrowElement extends FloatingArrowBase {
  get updateComplete() {
    return this.updated;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floating-arrow': FloatingArrowElement;
  }
}
