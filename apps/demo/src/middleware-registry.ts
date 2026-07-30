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
    description: 'Scroll up. The preferred bottom placement flips to top when bottom space disappears.',
  },
  {
    id: 'arrow',
    number: '04',
    title: 'Arrow',
    docsPath: 'arrow',
    description: 'Scroll horizontally. The square arrow keeps pointing toward the reference center.',
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
    description: 'Scroll vertically. The panel continuously chooses the side with the most available space.',
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

export type MiddlewareExampleId = (typeof MIDDLEWARE_EXAMPLES)[number]['id'];

export function getMiddlewareExample(id: MiddlewareExampleId) {
  const example = MIDDLEWARE_EXAMPLES.find((item) => item.id === id);
  if (!example) throw new Error(`Unknown middleware example: ${id}`);
  return example;
}
