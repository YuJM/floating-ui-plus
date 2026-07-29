import {
  click as webClick,
  clientPoint as webClientPoint,
  dismiss as webDismiss,
  focus as webFocus,
  hover as webHover,
  listNavigation as webListNavigation,
  role as webRole,
  safePolygon as webSafePolygon,
  typeahead as webTypeahead,
  type ClickOptions,
  type ClientPointOptions,
  type DismissOptions,
  type FocusOptions,
  type HoverOptions,
  type ListNavigationOptions,
  type RoleOptions,
  type SafePolygonOptions,
  type TypeaheadOptions,
} from '@floating-ui-plus/web';
import {toValue} from 'vue';

import type {MaybeReadonlyRefOrGetter} from './types';

export function click(
  options: MaybeReadonlyRefOrGetter<ClickOptions> = {},
) {
  return webClick(() => toValue(options));
}

export function clientPoint(
  options: MaybeReadonlyRefOrGetter<ClientPointOptions> = {},
) {
  return webClientPoint(() => toValue(options));
}

export function dismiss(
  options: MaybeReadonlyRefOrGetter<DismissOptions> = {},
) {
  return webDismiss(() => toValue(options));
}

export function focus(
  options: MaybeReadonlyRefOrGetter<FocusOptions> = {},
) {
  return webFocus(() => toValue(options));
}

export function hover(
  options: MaybeReadonlyRefOrGetter<HoverOptions> = {},
) {
  return webHover(() => toValue(options));
}

export function listNavigation(
  options: MaybeReadonlyRefOrGetter<ListNavigationOptions>,
) {
  return webListNavigation(() => toValue(options));
}

export function role(
  options: MaybeReadonlyRefOrGetter<RoleOptions> = {},
) {
  return webRole(() => toValue(options));
}

export function safePolygon(
  options: MaybeReadonlyRefOrGetter<SafePolygonOptions> = {},
) {
  return webSafePolygon(toValue(options));
}

export function typeahead(
  options: MaybeReadonlyRefOrGetter<TypeaheadOptions>,
) {
  return webTypeahead(() => toValue(options));
}
