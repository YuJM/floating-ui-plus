import {describe, expect, test} from 'vitest';

import {
  FLOATING_TRANSFORM_ORIGIN_VARIABLE,
  getFloatingTransformOrigin,
  transformOrigin,
  type MiddlewareState,
  type Placement,
  type Rect,
} from '../src';

function createState(
  placement: Placement,
  options: {
    x?: number;
    y?: number;
    reference?: Partial<Rect>;
    floating?: Partial<Rect>;
  } = {},
) {
  const floating = document.createElement('div');
  const reference = document.createElement('button');
  return {
    x: options.x ?? 80,
    y: options.y ?? 70,
    initialPlacement: placement,
    placement,
    strategy: 'absolute',
    middlewareData: {},
    rects: {
      reference: {x: 100, y: 100, width: 40, height: 20, ...options.reference},
      floating: {x: 0, y: 0, width: 100, height: 60, ...options.floating},
    },
    platform: {},
    elements: {reference, floating},
  } as unknown as MiddlewareState;
}

describe('transformOrigin middleware', () => {
  test.each([
    ['top-start', '40px 60px'],
    ['right-end', '0px 40px'],
    ['bottom', '40px 0px'],
    ['left', '100px 40px'],
  ] as const)('points %s toward the reference', (placement, value) => {
    const state = createState(placement);

    expect(getFloatingTransformOrigin(state).value).toBe(value);
  });

  test('uses final shifted coordinates for aligned placements', () => {
    const state = createState('bottom-start', {x: 110});

    expect(getFloatingTransformOrigin(state)).toEqual({
      x: 10,
      y: 0,
      value: '10px 0px',
    });
  });

  test('clamps the cross-axis origin with padding', () => {
    const state = createState('top-end', {x: 140});

    expect(getFloatingTransformOrigin(state, 12).value).toBe('12px 60px');
  });

  test('writes the default CSS variable and exposes middleware data', async () => {
    const state = createState('bottom');
    const middleware = transformOrigin();
    const result = await middleware.fn(state);

    expect(middleware.name).toBe('transformOrigin');
    expect(
      state.elements.floating.style.getPropertyValue(
        FLOATING_TRANSFORM_ORIGIN_VARIABLE,
      ),
    ).toBe('40px 0px');
    expect(result.data).toEqual({x: 40, y: 0, value: '40px 0px'});
  });

  test('can write an application-defined CSS variable', async () => {
    const state = createState('left');

    await transformOrigin({cssVariable: '--demo-origin'}).fn(state);

    expect(
      state.elements.floating.style.getPropertyValue('--demo-origin'),
    ).toBe('100px 40px');
  });
});
