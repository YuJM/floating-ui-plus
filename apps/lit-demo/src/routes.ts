import type {Route} from '@vaadin/router';

export const routes: Route[] = [
  {
    path: '/',
    component: 'lit-home-view',
    action: async () => {
      await import('./views/home-view');
    },
  },
  {
    path: '/examples/tooltip',
    component: 'lit-tooltip-view',
    action: async () => {
      await import('./views/tooltip-view');
    },
  },
  {
    path: '/examples/popover',
    component: 'lit-popover-view',
    action: async () => {
      await import('./views/popover-view');
    },
  },
  {
    path: '/examples/menu',
    component: 'lit-menu-view',
    action: async () => {
      await import('./views/menu-view');
    },
  },
  {
    path: '/examples/modal',
    component: 'lit-modal-view',
    action: async () => {
      await import('./views/modal-view');
    },
  },
  {path: '/(.*)', redirect: '/'},
];
