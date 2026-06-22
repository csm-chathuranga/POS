import './bootstrap';
import '../css/app.css';

import { createApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ZiggyVue } from '../../vendor/tightenco/ziggy';
import { useLocale, initLocale } from './composables/useLocale';
import { useTheme, initTheme } from './composables/useTheme';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
    setup({ el, App, props, plugin }) {
        const dbSettings = props.initialPage?.props?.appSettings || {};
        initLocale(dbSettings);
        initTheme(dbSettings);
        const { locale, t, toggleLocale, setLocale, billLocale, tBill, setBillLocale } = useLocale();
        const { applyTheme, setSidebarPreset, setPrimaryPreset, sidebarPreset, primaryPreset } = useTheme();
        applyTheme();
        const app = createApp({ render: () => h(App, props) })
            .use(plugin)
            .use(ZiggyVue);
        app.provide('locale', locale);
        app.provide('t', t);
        app.provide('toggleLocale', toggleLocale);
        app.provide('setLocale', setLocale);
        app.provide('billLocale', billLocale);
        app.provide('tBill', tBill);
        app.provide('setBillLocale', setBillLocale);
        app.provide('sidebarPreset', sidebarPreset);
        app.provide('primaryPreset', primaryPreset);
        app.provide('setSidebarPreset', setSidebarPreset);
        app.provide('setPrimaryPreset', setPrimaryPreset);
        return app.mount(el);
    },
    progress: {
        color: '#4B5563',
    },
});
