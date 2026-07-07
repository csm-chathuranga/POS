<script setup>
import { ref, computed, watch, provide, inject, onMounted, onUnmounted } from 'vue';
import { Link, usePage, router } from '@inertiajs/vue3';

const page = usePage();
const user = computed(() => page.props.auth.user);
const isAdmin = computed(() => user.value?.role === 'admin');
const isManager = computed(() => ['admin', 'manager'].includes(user.value?.role));
const flash = computed(() => page.props.flash || {});

const sidebarOpen      = ref(false);
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true');
const posFullscreen    = ref(false);
provide('posFullscreen', posFullscreen);

function toggleCollapse() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value);
}

// Auto-collapse sidebar on sales.create, restore preference on other pages
let autoCollapsed = false;
function applySidebarForRoute() {
    const onPOS = route().current('sales.create');
    if (onPOS && !sidebarCollapsed.value) {
        sidebarCollapsed.value = true;
        autoCollapsed = true;
    } else if (!onPOS && autoCollapsed) {
        sidebarCollapsed.value = localStorage.getItem('sidebarCollapsed') === 'true';
        autoCollapsed = false;
    }
}

// ── Locale ────────────────────────────────────────────────────────────────────
const t            = inject('t');
const locale       = inject('locale');
const toggleLocale = inject('toggleLocale');

// ── Global printer shortcut (Ctrl+Shift+P) ───────────────────────────────────
const printerToast   = ref(null);
const currentPrinter = ref(typeof window !== 'undefined' ? (localStorage.getItem('pos_printer') || '') : '');
const isElectron     = computed(() => typeof window !== 'undefined' && !!window.electronAPI?.isElectron);
let printerToastTimer = null;

function showPrinterToast(msg, type = 'success') {
    printerToast.value = { msg, type };
    clearTimeout(printerToastTimer);
    printerToastTimer = setTimeout(() => { printerToast.value = null; }, 2500);
}

async function openGlobalPrinterPicker() {
    if (!isElectron.value) return;
    const result = await window.electronAPI.openPrinterDialog();
    if (result?.name) {
        localStorage.setItem('pos_printer', result.name);
        currentPrinter.value = result.name;
        showPrinterToast(`🖨 ${result.name}`);
    }
}

function onGlobalKeydown(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        openGlobalPrinterPicker();
    }
}

const navigating = ref(false);

let removeNavListener;
let removeFinishListener;
let removeStartListener;
onMounted(() => {
    window.addEventListener('keydown', onGlobalKeydown);
    applySidebarForRoute();
    checkFlash();
    removeStartListener  = router.on('start',    () => { navigating.value = true; });
    removeNavListener    = router.on('navigate', () => { navigating.value = false; applySidebarForRoute(); checkFlash(); });
    removeFinishListener = router.on('finish',   () => { navigating.value = false; lastFlashKey = null; checkFlash(); });
});
onUnmounted(() => {
    window.removeEventListener('keydown', onGlobalKeydown);
    removeStartListener?.();
    removeNavListener?.();
    removeFinishListener?.();
});

const ALL_ROLES    = ['admin', 'manager', 'cashier'];
const MANAGER_PLUS = ['admin', 'manager'];

const mainNavItems = [
    { labelKey: 'nav.dashboard',   routeName: 'dashboard',       roles: ALL_ROLES,    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>` },
    { labelKey: 'nav.sales',       routeName: 'sales.create',    roles: ALL_ROLES,    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>` },
    { labelKey: 'nav.products',    routeName: 'products.index',    roles: MANAGER_PLUS, icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>` },
    { labelKey: 'nav.categories',  routeName: 'categories.index',  roles: MANAGER_PLUS, icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>` },
    { labelKey: 'nav.purchases',   routeName: 'purchases.index',   roles: MANAGER_PLUS, icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>` },
    { labelKey: 'nav.suppliers',   routeName: 'suppliers.index', roles: MANAGER_PLUS, icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>` },
    { labelKey: 'nav.customers',   routeName: 'customers.index', roles: ALL_ROLES,    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>` },
    { labelKey: 'nav.reports',     routeName: 'reports.index',   roles: MANAGER_PLUS, icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>` },
    { labelKey: 'nav.credit_book', routeName: 'naya-potha.index',roles: ALL_ROLES,    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>` },
];

const promotionsEnabled = computed(() => {
    const v = page.props.appSettings?.enable_promotions;
    return v === '1' || v === true;
});

const visibleNavItems = computed(() => {
    const items = mainNavItems.filter(item => item.roles.includes(user.value?.role));
    if (promotionsEnabled.value) {
        const catIdx = items.findIndex(i => i.routeName === 'categories.index');
        const promoItem = {
            labelKey: 'nav.promotions',
            routeName: 'promotions.index',
            roles: MANAGER_PLUS,
            icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /><circle cx="9" cy="9" r="1" fill="currentColor"/></svg>`,
        };
        if (catIdx !== -1) items.splice(catIdx + 1, 0, promoItem);
        else items.push(promoItem);
    }
    return items;
});

const adminNavItems = [
    { labelKey: 'nav.settings',  routeName: 'settings.index',  icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>` },
    { labelKey: 'nav.users',     routeName: 'users.index',     icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>` },
];

const mobileNavItems = computed(() =>
    mainNavItems
        .filter(item => item.roles.includes(user.value?.role))
        .slice(0, 5)
        .map(item => ({ ...item, icon: item.icon.replace('h-5 w-5', 'h-6 w-6') }))
);

function isActive(routeName) {
    try { return route().current(routeName); } catch { return false; }
}

// ── Global flash toast ────────────────────────────────────────────────────────
const toast = ref(null);
let toastTimer = null;
let lastFlashKey = null;

function showToast(type, message) {
    toast.value = { type, message };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.value = null; }, 3500);
}

function checkFlash() {
    const f = page.props.flash;
    if (f?.success) {
        const key = 'success:' + f.success;
        if (key !== lastFlashKey) { lastFlashKey = key; showToast('success', f.success); }
    } else if (f?.error) {
        const key = 'error:' + f.error;
        if (key !== lastFlashKey) { lastFlashKey = key; showToast('error', f.error); }
    }
}

const reloading = ref(false);
function reloadApp() {
    reloading.value = true;
    window.location.reload();
}
</script>

<template>
    <div class="min-h-screen flex dark:bg-slate-900">

        <!-- ── Page navigation loader ── -->
        <Transition name="nav-loader">
            <div v-if="navigating" class="fixed inset-0 z-[9998] pointer-events-none">
                <div class="absolute inset-0 bg-white/30 dark:bg-slate-900/30 backdrop-blur-[1px]"></div>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
                    <svg class="animate-spin h-9 w-9 text-blue-500 drop-shadow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                </div>
            </div>
        </Transition>

        <!-- ── Printer-saved toast (Ctrl+Shift+P) ── -->
        <Transition name="printer-toast">
            <div
                v-if="printerToast"
                class="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-none"
                :style="printerToast.type === 'success'
                    ? 'background:#0f172a; color:#38bdf8; border:1.5px solid #1e3a5f;'
                    : 'background:#7f1d1d; color:#fca5a5; border:1.5px solid #991b1b;'"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <div>
                    <div style="font-size:10px; opacity:0.7; font-weight:500; margin-bottom:1px;">Printer saved</div>
                    {{ printerToast.msg }}
                </div>
            </div>
        </Transition>

        <!-- ───── Desktop Sidebar ───── -->
        <aside
            class="hidden md:flex md:flex-col md:fixed md:inset-y-0 z-30 print:hidden transition-all duration-300 overflow-hidden"
            :class="[
                posFullscreen ? '!hidden' : '',
                sidebarCollapsed ? 'md:w-16' : 'md:w-64',
            ]"
            style="background-color: var(--sidebar-bg, #1e293b);"
        >
            <!-- Brand -->
            <div
                class="flex items-center justify-center h-16 px-3 flex-shrink-0"
                style="background-color: var(--sidebar-header, #0f172a);"
            >
                <Link :href="route('dashboard')" class="flex items-center gap-2 min-w-0">
                    <img
                        v-if="page.props.appSettings?.logo"
                        :src="page.props.appSettings.logo"
                        alt="Logo"
                        class="w-8 h-8 rounded-lg object-contain flex-shrink-0"
                    />
                    <div
                        v-else
                        class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-blue-600 text-white font-bold text-sm"
                    >P</div>
                    <span v-if="!sidebarCollapsed" class="font-bold text-base text-white truncate">
                        {{ page.props.appSettings?.shop_name || 'POS' }}
                    </span>
                </Link>
            </div>

            <!-- Nav -->
            <nav class="flex-1 py-3 space-y-0.5" :class="[sidebarCollapsed ? 'px-2 overflow-hidden' : 'px-3 overflow-y-auto overflow-x-hidden']">
                <template v-for="item in visibleNavItems" :key="item.routeName">
                    <Link
                        :href="route(item.routeName)"
                        :title="sidebarCollapsed ? t(item.labelKey) : ''"
                        class="sidebar-nav-link flex items-center rounded-lg font-medium transition-colors duration-150 min-h-[42px] group relative"
                        :class="[
                            sidebarCollapsed ? 'justify-center px-0' : 'px-3',
                            isActive(item.routeName) ? 'sidebar-active' : 'sidebar-inactive',
                        ]"
                    >
                        <span class="flex-shrink-0" v-html="item.icon"></span>
                        <span v-if="!sidebarCollapsed" class="ml-3 text-sm">{{ t(item.labelKey) }}</span>
                        <span
                            v-if="sidebarCollapsed"
                            class="sidebar-tooltip absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                        >{{ t(item.labelKey) }}</span>
                    </Link>
                </template>

                <template v-if="isManager">
                    <div :class="sidebarCollapsed ? 'my-2 border-t border-slate-700' : 'pt-4 pb-1'">
                        <p v-if="!sidebarCollapsed" class="px-3 text-[10px] font-semibold sidebar-section-label uppercase tracking-wider">Admin</p>
                    </div>
                    <template v-for="item in adminNavItems" :key="item.routeName">
                        <Link
                            :href="route(item.routeName)"
                            :title="sidebarCollapsed ? t(item.labelKey) : ''"
                            class="sidebar-nav-link flex items-center rounded-lg font-medium transition-colors duration-150 min-h-[42px] group relative"
                            :class="[
                                sidebarCollapsed ? 'justify-center px-0' : 'px-3',
                                isActive(item.routeName) ? 'sidebar-active' : 'sidebar-inactive',
                            ]"
                        >
                            <span class="flex-shrink-0" v-html="item.icon"></span>
                            <span v-if="!sidebarCollapsed" class="ml-3 text-sm">{{ t(item.labelKey) }}</span>
                            <span
                                v-if="sidebarCollapsed"
                                class="sidebar-tooltip absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                            >{{ t(item.labelKey) }}</span>
                        </Link>
                    </template>
                </template>
            </nav>

            <!-- User info at bottom -->
            <div class="border-t border-slate-700 p-3 flex-shrink-0">
                <!-- Printer shortcut badge (Electron only) -->
                <button
                    v-if="isElectron"
                    @click="openGlobalPrinterPicker"
                    class="w-full mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors text-left"
                    style="background:rgba(255,255,255,0.06); color:#94a3b8;"
                    :title="'Change printer (Ctrl+Shift+P)'"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <template v-if="!sidebarCollapsed">
                        <span class="flex-1 text-xs truncate min-w-0">{{ currentPrinter || 'Change printer' }}</span>
                        <span class="flex-shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style="background:rgba(255,255,255,0.12); color:#64748b; letter-spacing:0.5px;">⌃⇧P</span>
                    </template>
                </button>
                <!-- Collapse / expand toggle above avatar -->
                <button
                    @click="toggleCollapse"
                    class="w-full flex items-center justify-center mb-2 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-white"
                    style="background-color: rgba(255,255,255,0.07);"
                    :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                >
                    <svg v-if="sidebarCollapsed" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                </button>
                <div class="flex items-center" :class="sidebarCollapsed ? 'justify-center' : 'gap-3'">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style="background-color: var(--sidebar-active, #2563eb);">
                        <span class="text-sm font-bold text-white">{{ user?.name?.charAt(0)?.toUpperCase() }}</span>
                    </div>
                    <template v-if="!sidebarCollapsed">
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-white truncate">{{ user?.name }}</p>
                            <p class="text-xs sidebar-muted truncate capitalize">{{ user?.role }}</p>
                        </div>
                        <Link
                            :href="route('logout')"
                            method="post"
                            as="button"
                            class="sidebar-muted hover:text-white transition-colors flex-shrink-0"
                            title="ලොග් අවුට්"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </Link>
                    </template>
                </div>
            </div>
        </aside>

        <!-- ───── Main content ───── -->
        <div
            class="flex-1 flex flex-col print:ml-0 transition-all duration-300"
            :class="posFullscreen ? 'ml-0' : (sidebarCollapsed ? 'md:ml-16' : 'md:ml-64')"
        >
            <!-- Header -->
            <header class="bg-white dark:bg-slate-900 h-16 flex items-center px-4 md:px-6 sticky top-0 z-20 print:hidden" style="border-bottom:1px solid #E2E8F0;">
                <!-- Mobile menu -->
                <button
                    @click="sidebarOpen = !sidebarOpen"
                    class="md:hidden mr-3 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <div class="flex-1">
                    <slot name="header">
                        <h1 class="text-lg font-semibold text-gray-800 dark:text-slate-100">LUMAC POS</h1>
                    </slot>
                </div>

                <!-- Reload button -->
                <button
                    @click="reloadApp"
                    :disabled="reloading"
                    title="Reload"
                    class="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        :class="reloading ? 'animate-spin' : ''"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                <div class="flex items-center gap-2 ml-4 pl-4" style="border-left:1px solid #E2E8F0;">
                    <div class="hidden sm:flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background-color: var(--primary, #2563eb);">
                            <span class="text-sm font-bold text-white">{{ user?.name?.charAt(0)?.toUpperCase() }}</span>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-700 dark:text-slate-200">{{ user?.name }}</p>
                            <p class="text-xs text-gray-500 dark:text-slate-400 capitalize">{{ user?.role }}</p>
                        </div>
                    </div>
                    <Link
                        :href="route('logout')"
                        method="post"
                        as="button"
                        class="hidden sm:flex items-center text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-md hover:bg-red-50 min-h-[44px]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {{ t('btn.logout') }}
                    </Link>
                </div>
            </header>

            <!-- Global flash toast -->
            <Transition name="global-toast">
                <div
                    v-if="toast"
                    class="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold max-w-sm print:hidden"
                    :class="toast.type === 'success'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'"
                >
                    <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span class="flex-1">{{ toast.message }}</span>
                    <button @click="toast = null" class="opacity-75 hover:opacity-100 ml-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </Transition>

            <main class="flex-1 px-4 md:px-6 pt-1 md:pt-1 pb-20 md:pb-6 print:p-0 dark:bg-slate-900 dark:text-slate-100">
                <slot />
            </main>
        </div>

        <!-- Mobile overlay -->
        <div v-if="sidebarOpen" class="fixed inset-0 z-40 md:hidden" @click="sidebarOpen = false">
            <div class="absolute inset-0 bg-black/50"></div>
        </div>

        <!-- Mobile drawer -->
        <aside v-if="sidebarOpen" class="fixed inset-y-0 left-0 z-50 w-64 text-white md:hidden flex flex-col" style="background-color: var(--sidebar-bg, #1e293b);">
            <div class="flex items-center justify-between h-16 px-4" style="background-color: var(--sidebar-header, #0f172a);">
                <span class="font-bold text-lg text-white">LUMAC POS</span>
                <button @click="sidebarOpen = false" class="sidebar-toggle-btn hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
                <Link
                    v-for="item in visibleNavItems"
                    :key="item.routeName"
                    :href="route(item.routeName)"
                    @click="sidebarOpen = false"
                    class="sidebar-nav-link flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors min-h-[44px] text-sm"
                    :class="isActive(item.routeName) ? 'sidebar-active' : 'sidebar-inactive'"
                >
                    <span class="mr-3 flex-shrink-0" v-html="item.icon"></span>
                    {{ t(item.labelKey) }}
                </Link>
                <template v-if="isManager">
                    <div class="pt-4 pb-1">
                        <p class="px-3 text-[10px] font-semibold sidebar-section-label uppercase tracking-wider">Admin</p>
                    </div>
                    <Link
                        v-for="item in adminNavItems"
                        :key="item.routeName"
                        :href="route(item.routeName)"
                        @click="sidebarOpen = false"
                        class="sidebar-nav-link flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors min-h-[44px] text-sm"
                        :class="isActive(item.routeName) ? 'sidebar-active' : 'sidebar-inactive'"
                    >
                        <span class="mr-3 flex-shrink-0" v-html="item.icon"></span>
                        {{ t(item.labelKey) }}
                    </Link>
                </template>
            </nav>
            <div class="border-t border-slate-700 p-4">
                <Link :href="route('logout')" method="post" as="button" class="flex items-center sidebar-inactive hover:text-white text-sm min-h-[44px]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {{ t('btn.logout') }}
                </Link>
            </div>
        </aside>

        <!-- Mobile bottom nav -->
        <nav v-show="!posFullscreen" class="md:hidden fixed bottom-0 left-0 right-0 bg-white z-30 flex print:hidden" style="border-top:1px solid #E2E8F0;">
            <Link
                v-for="item in mobileNavItems"
                :key="item.routeName"
                :href="route(item.routeName)"
                class="flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] text-xs transition-colors"
                :style="isActive(item.routeName) ? 'color: var(--primary, #2563eb)' : ''"
                :class="isActive(item.routeName) ? '' : 'text-slate-500 hover:text-slate-700'"
            >
                <span v-html="item.icon" class="mb-1"></span>
                <span>{{ t(item.labelKey) }}</span>
            </Link>
        </nav>
    </div>
</template>

<style scoped>
/* ── Navigation loader transition ── */
.nav-loader-enter-active, .nav-loader-leave-active { transition: opacity 0.15s ease; }
.nav-loader-enter-from, .nav-loader-leave-to       { opacity: 0; }

/* ── Sidebar theming via CSS variables ── */
.sidebar-nav-link {
    color: var(--sidebar-text, #cbd5e1);
}
.sidebar-nav-link.sidebar-active {
    background-color: var(--sidebar-active, #2563eb);
    color: #ffffff;
}
.sidebar-nav-link.sidebar-inactive:hover {
    background-color: var(--sidebar-hover, #334155);
    color: #ffffff;
}
.sidebar-toggle-btn {
    color: var(--sidebar-text, #94a3b8);
}
.sidebar-toggle-btn:hover {
    color: #ffffff;
    background-color: var(--sidebar-hover, #334155);
}
.sidebar-muted {
    color: var(--sidebar-text, #94a3b8);
    opacity: 0.75;
}
.sidebar-section-label {
    color: var(--sidebar-text, #94a3b8);
    opacity: 0.6;
}
.sidebar-tooltip {
    background-color: var(--sidebar-header, #0f172a);
}

/* Printer-saved toast */
.printer-toast-enter-active, .printer-toast-leave-active { transition: all 0.25s ease; }
.printer-toast-enter-from, .printer-toast-leave-to { opacity: 0; transform: translateY(12px); }

/* Global flash toast */
.global-toast-enter-active, .global-toast-leave-active { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.global-toast-enter-from, .global-toast-leave-to { opacity: 0; transform: translateX(24px) scale(0.95); }
</style>
