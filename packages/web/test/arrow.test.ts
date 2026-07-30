import {describe, expect, test} from 'vitest';

import {
  arrow,
  createFloating,
  FLOATING_UI_PLUS_ARROW_ATTRIBUTE,
  FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
  getArrowMainAxisSize,
  offset,
  registerFloatingArrow,
  type Middleware,
  type MiddlewareState,
  withArrowOffset,
} from '../src';

function createMarkedArrow(height: number) {
  const element = document.createElement('span');
  element.setAttribute(FLOATING_UI_PLUS_ARROW_ATTRIBUTE, '');
  element.setAttribute(
    FLOATING_UI_PLUS_ARROW_HEIGHT_ATTRIBUTE,
    String(height),
  );
  return element;
}

function evaluateOffset(middleware: Middleware, placement = 'top') {
  const options = middleware.options;
  return typeof options === 'function'
    ? options({placement} as MiddlewareState)
    : options;
}

describe('Arrow-aware offset composition', () => {
  test('stores Arrow geometry on the owning Floating context', () => {
    const controller = createFloating();
    const arrowElement = createMarkedArrow(7);
    const unregister = registerFloatingArrow(controller.context, {
      element: arrowElement,
      height: 7,
    });

    expect(controller.context.data.arrow).toEqual({
      element: arrowElement,
      height: 7,
    });
    unregister();
    expect(controller.context.data.arrow).toBeUndefined();
    controller.destroy();
  });

  test('adds the Arrow height to a numeric user gap', () => {
    const arrowElement = createMarkedArrow(7);

    const middleware = withArrowOffset(
      [offset(3), arrow({element: arrowElement})],
      {element: arrowElement, height: 7},
    )!;

    expect(evaluateOffset(middleware[0] as Middleware)).toBe(10);
  });

  test('preserves cross-axis options and derivable user gaps', () => {
    const arrowElement = createMarkedArrow(9);

    const middleware = withArrowOffset(
      [
        offset(() => ({mainAxis: 4, crossAxis: 6, alignmentAxis: 2})),
        arrow({element: arrowElement}),
      ],
      {element: arrowElement, height: 9},
    )!;

    expect(evaluateOffset(middleware[0] as Middleware, 'left')).toEqual({
      mainAxis: 13,
      crossAxis: 6,
      alignmentAxis: 2,
    });
  });

  test('does not infer an unrelated Arrow without a context registration', () => {
    const arrowElement = createMarkedArrow(11);
    const middleware = [offset(3), arrow({element: arrowElement})];

    expect(withArrowOffset(middleware, undefined)).toBe(middleware);
  });

  test('reads explicit Arrow depth independently from placement rotation', () => {
    const arrowElement = createMarkedArrow(7);

    expect(getArrowMainAxisSize(arrowElement, 'top')).toBe(7);
    expect(getArrowMainAxisSize(arrowElement, 'right')).toBe(7);
    expect(getArrowMainAxisSize(arrowElement, 'bottom')).toBe(7);
    expect(getArrowMainAxisSize(arrowElement, 'left')).toBe(7);
  });
});
