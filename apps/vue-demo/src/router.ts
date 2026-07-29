import {createRouter, createWebHistory} from 'vue-router';

const routes = [
  {path: '/', name: 'home', component: () => import('./views/HomeView.vue')},
  {
    path: '/examples/:example',
    name: 'example',
    component: () => import('./views/ExampleView.vue'),
  },
  {
    path: '/middleware',
    name: 'middleware',
    component: () => import('./views/MiddlewareView.vue'),
  },
  {path: '/:pathMatch(.*)*', redirect: '/'},
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({top: 0}),
});
