import {Router} from '@vaadin/router';

import {routes} from './routes';
import './shell';
import './styles.css';

const outlet = document.querySelector<HTMLElement>('#outlet');

if (!outlet) {
  throw new Error('The demo router requires an #outlet element.');
}

export const router = new Router(outlet);

void router.setRoutes(routes);
