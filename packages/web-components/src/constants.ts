import {FLOATING_UI_PLUS_DATA_ATTRIBUTE} from '@floating-ui-plus/web';

/** Marks a native template as the conditional surface for a floating root. */
export const FLOATING_UI_PLUS_CONTENT_ATTRIBUTE =
  `${FLOATING_UI_PLUS_DATA_ATTRIBUTE}-content`;

/** Public content slot name for a root-owned native surface template. */
export const FLOATING_UI_PLUS_CONTENT_SLOT = 'content';

/** Supports the `slot="content"` public API and the legacy data attribute. */
export const FLOATING_UI_PLUS_CONTENT_TEMPLATE_SELECTOR =
  `template[slot="${FLOATING_UI_PLUS_CONTENT_SLOT}"], template[${FLOATING_UI_PLUS_CONTENT_ATTRIBUTE}]`;

export function isFloatingContentTemplate(template: HTMLTemplateElement) {
  return template.slot === FLOATING_UI_PLUS_CONTENT_SLOT ||
    template.hasAttribute(FLOATING_UI_PLUS_CONTENT_ATTRIBUTE);
}

/** Marks a control that closes the floating surface which owns it. */
export const FLOATING_UI_PLUS_CLOSE_ATTRIBUTE =
  `${FLOATING_UI_PLUS_DATA_ATTRIBUTE}-close`;
