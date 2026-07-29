import type {Ref} from './common';

export type DisabledIndices =
  | Array<number>
  | ((index: number) => boolean)
  | undefined;

export function isIndexOutOfListBounds(
  listRef: Ref<Array<HTMLElement | null>>,
  index: number,
) {
  return index < 0 || index >= listRef.current.length;
}

export function isListIndexDisabled(
  listRef: Ref<Array<HTMLElement | null>>,
  index: number,
  disabledIndices?: DisabledIndices,
) {
  if (typeof disabledIndices === 'function') {
    return disabledIndices(index);
  }
  if (disabledIndices) {
    return disabledIndices.includes(index);
  }
  const element = listRef.current[index];
  return (
    element == null ||
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  );
}

export function findNonDisabledListIndex(
  listRef: Ref<Array<HTMLElement | null>>,
  {
    startingIndex = -1,
    decrement = false,
    disabledIndices,
    amount = 1,
  }: {
    startingIndex?: number;
    decrement?: boolean;
    disabledIndices?: DisabledIndices;
    amount?: number;
  } = {},
) {
  const list = listRef.current;
  let index = startingIndex;
  do {
    index += decrement ? -amount : amount;
  } while (
    index >= 0 &&
    index <= list.length - 1 &&
    isListIndexDisabled(listRef, index, disabledIndices)
  );
  return index;
}

export function getMinListIndex(
  listRef: Ref<Array<HTMLElement | null>>,
  disabledIndices?: DisabledIndices,
) {
  return findNonDisabledListIndex(listRef, {
    startingIndex: -1,
    disabledIndices,
  });
}

export function getMaxListIndex(
  listRef: Ref<Array<HTMLElement | null>>,
  disabledIndices?: DisabledIndices,
) {
  return findNonDisabledListIndex(listRef, {
    startingIndex: listRef.current.length,
    decrement: true,
    disabledIndices,
  });
}

export function getGridNavigatedIndex(
  listRef: Ref<Array<HTMLElement | null>>,
  {
    key,
    orientation,
    loop,
    rtl,
    cols,
    disabledIndices,
    minIndex,
    maxIndex,
    prevIndex,
  }: {
    key: string;
    orientation: 'horizontal' | 'vertical' | 'both';
    loop: boolean;
    rtl: boolean;
    cols: number;
    disabledIndices: DisabledIndices;
    minIndex: number;
    maxIndex: number;
    prevIndex: number;
  },
) {
  let nextIndex = prevIndex;

  if (key === 'ArrowUp') {
    if (prevIndex === -1) {
      nextIndex = maxIndex;
    } else {
      nextIndex = findNonDisabledListIndex(listRef, {
        startingIndex: nextIndex,
        amount: cols,
        decrement: true,
        disabledIndices,
      });

      if (loop && (prevIndex - cols < minIndex || nextIndex < 0)) {
        const col = prevIndex % cols;
        const maxCol = maxIndex % cols;
        const offset = maxIndex - (maxCol - col);
        nextIndex =
          maxCol === col ? maxIndex : maxCol > col ? offset : offset - cols;
      }
    }

    if (isIndexOutOfListBounds(listRef, nextIndex)) {
      nextIndex = prevIndex;
    }
  }

  if (key === 'ArrowDown') {
    if (prevIndex === -1) {
      nextIndex = minIndex;
    } else {
      nextIndex = findNonDisabledListIndex(listRef, {
        startingIndex: prevIndex,
        amount: cols,
        disabledIndices,
      });

      if (loop && prevIndex + cols > maxIndex) {
        nextIndex = findNonDisabledListIndex(listRef, {
          startingIndex: (prevIndex % cols) - cols,
          amount: cols,
          disabledIndices,
        });
      }
    }

    if (isIndexOutOfListBounds(listRef, nextIndex)) {
      nextIndex = prevIndex;
    }
  }

  if (orientation === 'both') {
    const prevRow = Math.floor(prevIndex / cols);
    const forwardKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backwardKey = rtl ? 'ArrowRight' : 'ArrowLeft';

    if (key === forwardKey) {
      if (prevIndex % cols !== cols - 1) {
        nextIndex = findNonDisabledListIndex(listRef, {
          startingIndex: prevIndex,
          disabledIndices,
        });

        if (
          loop &&
          isDifferentGridRow(prevIndex, nextIndex, cols)
        ) {
          nextIndex = findNonDisabledListIndex(listRef, {
            startingIndex: prevIndex - (prevIndex % cols) - 1,
            disabledIndices,
          });
        }
      } else if (loop) {
        nextIndex = findNonDisabledListIndex(listRef, {
          startingIndex: prevIndex - (prevIndex % cols) - 1,
          disabledIndices,
        });
      }

      if (Math.floor(nextIndex / cols) !== prevRow) {
        nextIndex = prevIndex;
      }
    }

    if (key === backwardKey) {
      if (prevIndex % cols !== 0) {
        nextIndex = findNonDisabledListIndex(listRef, {
          startingIndex: prevIndex,
          decrement: true,
          disabledIndices,
        });

        if (
          loop &&
          isDifferentGridRow(prevIndex, nextIndex, cols)
        ) {
          nextIndex = findNonDisabledListIndex(listRef, {
            startingIndex: prevIndex + (cols - (prevIndex % cols)),
            decrement: true,
            disabledIndices,
          });
        }
      } else if (loop) {
        nextIndex = findNonDisabledListIndex(listRef, {
          startingIndex: prevIndex + (cols - (prevIndex % cols)),
          decrement: true,
          disabledIndices,
        });
      }

      if (Math.floor(nextIndex / cols) !== prevRow) {
        nextIndex = prevIndex;
      }
    }

    const lastRow = Math.floor(maxIndex / cols) === prevRow;
    if (isIndexOutOfListBounds(listRef, nextIndex)) {
      if (loop && lastRow) {
        nextIndex =
          key === backwardKey
            ? maxIndex
            : findNonDisabledListIndex(listRef, {
                startingIndex: prevIndex - (prevIndex % cols) - 1,
                disabledIndices,
              });
      } else {
        nextIndex = prevIndex;
      }
    }
  }

  return nextIndex;
}

export function createGridCellMap(
  sizes: Array<{width: number; height: number}>,
  cols: number,
  dense: boolean,
) {
  const cellMap: Array<number | undefined> = [];
  sizes.forEach((size, index) => {
    let start = dense ? 0 : cellMap.length;
    while (true) {
      const col = start % cols;
      if (col + size.width <= cols) {
        let fits = true;
        for (let row = 0; row < size.height; row++) {
          for (let column = 0; column < size.width; column++) {
            if (cellMap[start + row * cols + column] != null) {
              fits = false;
            }
          }
        }
        if (fits) break;
      }
      start++;
    }

    for (let row = 0; row < size.height; row++) {
      for (let column = 0; column < size.width; column++) {
        cellMap[start + row * cols + column] = index;
      }
    }
  });
  return cellMap;
}

export function getGridCellIndices(
  indices: Array<number | undefined>,
  cellMap: Array<number | undefined>,
) {
  return cellMap
    .map((itemIndex, cellIndex) =>
      itemIndex == null || indices.includes(itemIndex) ? cellIndex : undefined,
    )
    .filter((index): index is number => index != null);
}

export function getGridCellIndexOfCorner(
  index: number,
  sizes: Array<{width: number; height: number}>,
  cellMap: Array<number | undefined>,
  cols: number,
  corner: 'tl' | 'tr' | 'bl' | 'br',
) {
  const start = cellMap.indexOf(index);
  const size = sizes[index] || {width: 1, height: 1};
  const right = corner === 'tr' || corner === 'br';
  const bottom = corner === 'bl' || corner === 'br';
  return (
    start + (right ? size.width - 1 : 0) + (bottom ? size.height - 1 : 0) * cols
  );
}

export function isDifferentGridRow(
  index: number,
  nextIndex: number,
  cols: number,
) {
  return Math.floor(index / cols) !== Math.floor(nextIndex / cols);
}
