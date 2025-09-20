import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

if (typeof window !== 'undefined') {
  const { pathname, hash } = window.location;
  if (pathname.startsWith('/tgWebAppData')) {
    const normalizedHash = hash && hash.length > 1 ? hash : '#/';
    window.history.replaceState({}, '', `${window.location.origin}/${normalizedHash}`);
  }
}

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
