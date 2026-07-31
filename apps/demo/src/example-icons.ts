import {
  CircleHelp,
  Focus,
  GitFork,
  ListFilter,
  Menu,
  MousePointer2,
  Move,
  PanelTop,
  SlidersHorizontal,
} from 'lucide-astro';
import type {ExampleId} from './i18n';

export const EXAMPLE_ICONS: Record<ExampleId, typeof CircleHelp> = {
  tooltip: CircleHelp,
  popover: PanelTop,
  menu: Menu,
  'nested-menu': GitFork,
  'client-point': MousePointer2,
  combobox: ListFilter,
  placement: Move,
  middleware: SlidersHorizontal,
  modal: Focus,
};
