export const MIDDLEWARE_EXAMPLES = [
  {
    id: 'offset',
    number: '01',
    title: 'Offset',
    docsPath: 'offset',
    description: 'Compare the default position with a 10px gutter on the main axis.',
  },
  {
    id: 'shift',
    number: '02',
    title: 'Shift',
    docsPath: 'shift',
    description: 'Scroll horizontally. The panel stays on top and shifts along the x-axis to remain visible.',
  },
  {
    id: 'flip',
    number: '03',
    title: 'Flip',
    docsPath: 'flip',
    description: 'Scroll up. Flip chooses the available side while shift keeps the panel inside the boundary.',
  },
  {
    id: 'arrow',
    number: '04',
    title: 'Arrow',
    docsPath: 'arrow',
    description: 'Scroll horizontally. Floating UI Plus adds the arrow height to the requested visual gap.',
  },
  {
    id: 'size',
    number: '05',
    title: 'Size',
    docsPath: 'size',
    description: 'Scroll vertically. Available height constrains the panel, whose content remains scrollable.',
  },
  {
    id: 'auto',
    number: '06',
    title: 'Auto placement',
    docsPath: 'autoplacement',
    description: 'Scroll vertically. Auto placement chooses the roomiest side while shift keeps it inside the boundary.',
  },
  {
    id: 'hide',
    number: '07',
    title: 'Hide',
    docsPath: 'hide',
    description: 'Scroll up. The panel dims after escaping, then hides when its reference is fully clipped.',
  },
  {
    id: 'inline',
    number: '08',
    title: 'Inline',
    docsPath: 'inline',
    description: 'Compare the detached bounding box with the relevant client rect of a wrapped inline anchor.',
  },
] as const;

export const MIDDLEWARE_ARROW = {
  width: 14,
  height: 7,
  gap: 3,
  staticOffset: -7,
} as const;

export type MiddlewareExampleId = (typeof MIDDLEWARE_EXAMPLES)[number]['id'];

export function getMiddlewareExample(id: MiddlewareExampleId) {
  const example = MIDDLEWARE_EXAMPLES.find((item) => item.id === id);
  if (!example) throw new Error(`Unknown middleware example: ${id}`);
  return example;
}
