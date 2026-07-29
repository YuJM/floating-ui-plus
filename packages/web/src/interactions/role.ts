import type {FloatingPlugin, ItemState, ValueOrGetter} from '../types';
import {createId, getFloatingFocusElement, getValue} from '../utils/common';

export type FloatingRole =
  | 'tooltip'
  | 'dialog'
  | 'alertdialog'
  | 'menu'
  | 'listbox'
  | 'grid'
  | 'tree'
  | 'select'
  | 'label'
  | 'combobox';

export interface RoleOptions {
  enabled?: boolean | undefined;
  role?: FloatingRole | undefined;
}

export function role(options: ValueOrGetter<RoleOptions> = {}): FloatingPlugin {
  const referenceId = createId('floating-ui-reference');

  function apply(context: Parameters<FloatingPlugin['connect']>[0]) {
    const {enabled = true, role = 'dialog'} = getValue(options);
    if (!enabled) {
      context.attributes.reference = {};
      context.attributes.floating = {};
      context.attributes.item = {};
      return;
    }

    const floatingId =
      getFloatingFocusElement(context.elements.floating)?.id ||
      context.floatingId;
    const ariaRole =
      role === 'select' || role === 'combobox'
        ? 'listbox'
        : role === 'label'
          ? false
          : role;

    if (ariaRole === 'tooltip' || role === 'label') {
      context.attributes.reference = {
        [role === 'label' ? 'aria-labelledby' : 'aria-describedby']:
          context.open ? floatingId : undefined,
      };
    } else {
      context.attributes.reference = {
        'aria-expanded': context.open ? 'true' : 'false',
        'aria-haspopup': ariaRole === 'alertdialog' ? 'dialog' : ariaRole,
        'aria-controls': context.open ? floatingId : undefined,
        ...(ariaRole === 'listbox' ? {role: 'combobox'} : {}),
        ...(ariaRole === 'menu'
          ? {id: referenceId, ...(context.nested ? {role: 'menuitem'} : {})}
          : {}),
        ...(role === 'select' ? {'aria-autocomplete': 'none'} : {}),
        ...(role === 'combobox' ? {'aria-autocomplete': 'list'} : {}),
      };
    }

    context.attributes.floating = {
      id: floatingId,
      ...(ariaRole ? {role: ariaRole} : {}),
      ...(ariaRole === 'menu' ? {'aria-labelledby': referenceId} : {}),
    };
    context.attributes.item = (state: ItemState) => {
      if (role !== 'select' && role !== 'combobox') return {};
      return {
        role: 'option',
        ...(state.active ? {id: `${floatingId}-fui-option`} : {}),
        'aria-selected': state.selected ? 'true' : 'false',
      };
    };
  }

  return {
    name: 'role',
    connect(context) {
      apply(context);
      return context.events.on('openchange', () => apply(context));
    },
    update: apply,
  };
}
