import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  bindPresenceStackPause,
  parsePresencePauseOn,
} from '../src';

describe('parsePresencePauseOn', () => {
  test('accepts space-separated pointer and focus tokens', () => {
    expect([...parsePresencePauseOn('pointer focus')]).toEqual([
      'pointer',
      'focus',
    ]);
    expect([...parsePresencePauseOn(['focus'])]).toEqual(['focus']);
    expect(parsePresencePauseOn('').size).toBe(0);
    expect(parsePresencePauseOn(undefined).size).toBe(0);
    expect(parsePresencePauseOn('click hover').size).toBe(0);
  });
});

describe('bindPresenceStackPause', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  test('pauses on pointerenter and resumes after the delay', () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.append(host);
    const controller = {pause: vi.fn(), resume: vi.fn()};
    const unbind = bindPresenceStackPause(host, controller, {
      kinds: ['pointer'],
      resumeDelay: 100,
    });

    host.dispatchEvent(new Event('pointerenter'));
    expect(controller.pause).toHaveBeenCalledWith('pointer');

    host.dispatchEvent(new Event('pointerleave'));
    expect(controller.resume).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(controller.resume).toHaveBeenCalledWith('pointer');

    unbind();
  });

  test('cancels a pending pointer resume when the pointer re-enters', () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.append(host);
    const controller = {pause: vi.fn(), resume: vi.fn()};
    const unbind = bindPresenceStackPause(host, controller, {
      kinds: ['pointer'],
      resumeDelay: 100,
    });

    host.dispatchEvent(new Event('pointerenter'));
    host.dispatchEvent(new Event('pointerleave'));
    host.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(100);
    expect(controller.resume).not.toHaveBeenCalled();

    unbind();
  });
});
