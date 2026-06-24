<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import { ref, inject, onMounted } from 'vue';
import { getPrinters, isElectronRuntime } from '@/utils/printClient.js';
import { SIDEBAR_PRESETS, PRIMARY_PRESETS, useTheme } from '@/composables/useTheme.js';

const t             = inject('t');
const locale        = inject('locale');
const setLocale     = inject('setLocale');
const billLocale    = inject('billLocale');
const setBillLocale = inject('setBillLocale');

const { setSidebarPreset, setPrimaryPreset } = useTheme();

const LANGS = [
    { code: 'si', label: 'සිංහල' },
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ்' },
];


const BARCODE_SIZES = [
    { id: '20x30', label: '20 × 30 mm', desc: 'Small sticker' },
    { id: '40x25', label: '40 × 25 mm', desc: 'Standard label' },
    { id: '50x30', label: '50 × 30 mm', desc: 'Medium label' },
    { id: '58x40', label: '58 × 40 mm', desc: 'Large label' },
];

const props = defineProps({
    settings: { type: Object, default: () => ({}) },
});

// Printer (Electron only)
const isElectron  = isElectronRuntime();
const electronAPI = window.electronAPI ?? null;
const printers    = ref([]);

async function loadPrinters() {
    if (!isElectron) return;
    printers.value = await getPrinters();
    if (!form.settings.printer_name) {
        const def = printers.value.find(p => p.isDefault);
        if (def) form.settings.printer_name = def.name;
    }
}

// Sync DB settings to composables on mount
onMounted(() => {
    if (props.settings.ui_language)   setLocale(props.settings.ui_language);
    if (props.settings.bill_language) setBillLocale(props.settings.bill_language);
    if (props.settings.sidebar_theme) setSidebarPreset(props.settings.sidebar_theme);
    if (props.settings.primary_color) setPrimaryPreset(props.settings.primary_color);
    loadPrinters();
});


const form = useForm({
    settings: {
        shop_name:      props.settings.shop_name      || '',
        shop_address:   props.settings.shop_address   || '',
        shop_phone:     props.settings.shop_phone     || '',
        shop_email:     props.settings.shop_email     || '',
        currency:       props.settings.currency       || 'Rs.',
        tax_rate:       props.settings.tax_rate       || '0',
        receipt_footer: props.settings.receipt_footer || '',
        ui_language:    props.settings.ui_language    || 'si',
        bill_language:  props.settings.bill_language  || 'si',
        sidebar_theme:      props.settings.sidebar_theme      || 'slate',
        primary_color:      props.settings.primary_color      || 'blue',
        barcode_label_size: props.settings.barcode_label_size || '40x25',
        barcode_show_price: props.settings.barcode_show_price === '1' || props.settings.barcode_show_price === true || props.settings.barcode_show_price === undefined,
        logo:           props.settings.logo || '',
        demo_mode:      props.settings.demo_mode === '1' || props.settings.demo_mode === true,
        printer_name:   props.settings.printer_name || '',
    },
});

// Logo preview
const logoPreview = ref(props.settings.logo || null);
const logoInput   = ref(null);

function onLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        form.settings.logo = ev.target.result;
        logoPreview.value  = ev.target.result;
    };
    reader.readAsDataURL(file);
    if (logoInput.value) logoInput.value.value = '';
}

function removeLogo() {
    form.settings.logo = '';
    logoPreview.value  = null;
    if (logoInput.value) logoInput.value.value = '';
}

// Language buttons — update form AND apply immediately
function selectUILang(code) {
    form.settings.ui_language = code;
    setLocale(code);
}

function selectBillLang(code) {
    form.settings.bill_language = code;
    setBillLocale(code);
}

function selectSidebarTheme(id) {
    form.settings.sidebar_theme = id;
    setSidebarPreset(id);
}

function selectPrimaryColor(id) {
    form.settings.primary_color = id;
    setPrimaryPreset(id);
}

function save() {
    form.post('/settings', {
        preserveScroll: true,
    });
}

// Database import / export (Electron only)
const dbStatus = ref(null);
const dbBusy   = ref(false);
let dbStatusTimer = null;

function setDbStatus(type, message) {
    dbStatus.value = { type, message };
    clearTimeout(dbStatusTimer);
    dbStatusTimer = setTimeout(() => { dbStatus.value = null; }, 3500);
}

async function exportDb() {
    dbBusy.value = true;
    try {
        const result = await electronAPI?.exportDatabase();
        if (result?.success)        setDbStatus('success', 'Database exported successfully');
        else if (!result?.cancelled) setDbStatus('error', result?.error || 'Export failed');
    } finally { dbBusy.value = false; }
}

async function importDb() {
    if (!confirm('This will REPLACE the current database with the backup. All current data will be lost. Continue?')) return;
    dbBusy.value = true;
    try {
        const result = await electronAPI?.importDatabase();
        if (result?.success)        setDbStatus('success', 'Database imported and migrated successfully');
        else if (!result?.cancelled) setDbStatus('error', result?.error || 'Import failed');
    } finally { dbBusy.value = false; }
}

async function runMigrations() {
    dbBusy.value = true;
    try {
        const result = await electronAPI?.runMigrations();
        if (result?.success) setDbStatus('success', 'Migrations completed successfully');
        else                 setDbStatus('error', result?.error || 'Migration failed');
    } finally { dbBusy.value = false; }
}
</script>

<template>
    <Head :title="t('page.settings')" />

    <AuthenticatedLayout>
        <template #header>
            <h1 class="text-xl font-bold" style="color:#0F172A;">{{ t('page.settings') }}</h1>
        </template>

        <form @submit.prevent="save" novalidate class="max-w-5xl">

            <!-- Validation error summary -->
            <div v-if="form.hasErrors" class="mb-4 px-4 py-3 rounded-lg text-sm" style="background:#FEF2F2; border:1px solid #FCA5A5; color:#DC2626;">
                <p class="font-semibold mb-1">Please fix the following errors:</p>
                <ul class="list-disc list-inside space-y-0.5">
                    <li v-for="(msg, field) in form.errors" :key="field">{{ msg }}</li>
                </ul>
            </div>

            <!-- ── 2-column grid ── -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

                <!-- ══ LEFT: Shop Info + Receipt ══ -->
                <div class="space-y-5">

                    <!-- Shop Info card -->
                    <div class="bg-white rounded-xl shadow-sm p-5 space-y-4" style="border:1px solid #E2E8F0;">
                        <h2 class="font-semibold text-[15px]" style="color:#0F172A; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
                            {{ t('set.shop_info') }}
                        </h2>

                        <!-- Logo -->
                        <div>
                            <label class="block mb-2 text-sm font-medium" style="color:#334155;">{{ t('set.logo') }}</label>
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                                    style="border:2px dashed #E2E8F0; background:#F8FAFC;"
                                >
                                    <img v-if="logoPreview" :src="logoPreview" class="w-full h-full object-contain" alt="Logo" />
                                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" style="color:#CBD5E1;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style="border:1px solid #2563EB; color:#2563EB; background:#EFF6FF;">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        {{ t('btn.upload') }}
                                        <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="onLogoChange" />
                                    </label>
                                    <button v-if="logoPreview" type="button" @click="removeLogo" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style="border:1px solid #E2E8F0; color:#64748B; background:#F8FAFC;">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        {{ t('btn.delete') }}
                                    </button>
                                    <p class="text-xs" style="color:#94A3B8;">PNG / JPG · max 2 MB</p>
                                </div>
                            </div>
                            <p v-if="form.errors['settings.logo']" class="mt-1 text-xs" style="color:#DC2626;">{{ form.errors['settings.logo'] }}</p>
                        </div>

                        <!-- Shop Name -->
                        <div>
                            <label class="block mb-1 text-sm font-medium" style="color:#334155;">{{ t('set.shop_name') }}</label>
                            <input v-model="form.settings.shop_name" type="text" class="w-full rounded-lg px-3 py-2 text-sm outline-none" style="border:1px solid #E2E8F0; color:#0F172A;" placeholder="LMUC Convenience Store" />
                            <p v-if="form.errors['settings.shop_name']" class="mt-1 text-xs" style="color:#DC2626;">{{ form.errors['settings.shop_name'] }}</p>
                        </div>

                        <!-- Address -->
                        <div>
                            <label class="block mb-1 text-sm font-medium" style="color:#334155;">{{ t('set.address') }}</label>
                            <textarea v-model="form.settings.shop_address" rows="2" class="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style="border:1px solid #E2E8F0; color:#0F172A;" placeholder="No. 1, Main Street, Colombo"></textarea>
                        </div>

                        <!-- Phone + Email side by side -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block mb-1 text-sm font-medium" style="color:#334155;">{{ t('set.phone') }}</label>
                                <input v-model="form.settings.shop_phone" type="text" class="w-full rounded-lg px-3 py-2 text-sm outline-none" style="border:1px solid #E2E8F0; color:#0F172A;" placeholder="0112345678" />
                            </div>
                            <div>
                                <label class="block mb-1 text-sm font-medium" style="color:#334155;">{{ t('set.email') }}</label>
                                <input v-model="form.settings.shop_email" type="text" class="w-full rounded-lg px-3 py-2 text-sm outline-none" style="border:1px solid #E2E8F0; color:#0F172A;" placeholder="info@store.lk" />
                            </div>
                        </div>
                    </div>

                    <!-- Demo Mode card -->
                    <div class="bg-white rounded-xl shadow-sm p-5" style="border:1px solid #E2E8F0;">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-semibold" style="color:#0F172A;">Demo Mode</p>
                                <p class="text-xs mt-0.5" style="color:#94A3B8;">Show demo credentials on the login page. Disable for live deployment.</p>
                            </div>
                            <button
                                type="button"
                                @click="form.settings.demo_mode = !form.settings.demo_mode"
                                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                                :style="form.settings.demo_mode ? 'background:#F59E0B;' : 'background:#D1D5DB;'"
                            >
                                <span
                                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow"
                                    :class="form.settings.demo_mode ? 'translate-x-6' : 'translate-x-1'"
                                ></span>
                            </button>
                        </div>
                        <p v-if="form.settings.demo_mode" class="mt-2 text-xs font-medium px-2 py-1 rounded" style="background:#FEF3C7; color:#92400E;">
                            Demo credentials are visible on the login page
                        </p>
                    </div>

                    <!-- Receipt Settings card -->
                    <div class="bg-white rounded-xl shadow-sm p-5 space-y-4" style="border:1px solid #E2E8F0;">
                        <h2 class="font-semibold text-[15px]" style="color:#0F172A; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
                            {{ t('set.receipt_settings') }}
                        </h2>

                        <!-- Currency + Tax side by side -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block mb-1 text-sm font-medium" style="color:#334155;">{{ t('set.currency') }}</label>
                                <input v-model="form.settings.currency" type="text" class="w-full rounded-lg px-3 py-2 text-sm outline-none" style="border:1px solid #E2E8F0; color:#0F172A;" placeholder="Rs." />
                            </div>
                            <div>
                                <label class="block mb-1 text-sm font-medium" style="color:#334155;">{{ t('set.tax_rate') }}</label>
                                <input v-model="form.settings.tax_rate" type="number" min="0" max="100" step="0.01" class="w-full rounded-lg px-3 py-2 text-sm outline-none" style="border:1px solid #E2E8F0; color:#0F172A;" placeholder="0" />
                            </div>
                        </div>

                        <!-- Receipt Footer -->
                        <div>
                            <label class="block mb-1 text-sm font-medium" style="color:#334155;">{{ t('set.receipt_footer') }}</label>
                            <textarea v-model="form.settings.receipt_footer" rows="3" class="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style="border:1px solid #E2E8F0; color:#0F172A;"></textarea>
                        </div>
                    </div>
                </div>

                <!-- ══ RIGHT: Language + Appearance ══ -->
                <div class="space-y-5">

                    <!-- Language card -->
                    <div class="bg-white rounded-xl shadow-sm p-5 space-y-4" style="border:1px solid #E2E8F0;">
                        <h2 class="font-semibold text-[15px]" style="color:#0F172A; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
                            {{ t('set.ui_language') }}
                        </h2>

                        <!-- UI Language -->
                        <div>
                            <label class="block mb-2 text-xs font-semibold uppercase tracking-wide" style="color:#64748B;">{{ t('set.ui_language') }}</label>
                            <div class="flex gap-2 flex-wrap">
                                <button
                                    v-for="lang in LANGS"
                                    :key="lang.code"
                                    type="button"
                                    @click="selectUILang(lang.code)"
                                    class="px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-colors"
                                    :style="form.settings.ui_language === lang.code
                                        ? 'border-color:#2563EB; background-color:#EFF6FF; color:#1D4ED8;'
                                        : 'border-color:#E2E8F0; background-color:#F8FAFC; color:#334155;'"
                                >{{ lang.label }}</button>
                            </div>
                        </div>

                        <!-- Bill Language -->
                        <div>
                            <label class="block mb-2 text-xs font-semibold uppercase tracking-wide" style="color:#64748B;">{{ t('set.bill_language') }}</label>
                            <div class="flex gap-2 flex-wrap">
                                <button
                                    v-for="lang in LANGS"
                                    :key="lang.code"
                                    type="button"
                                    @click="selectBillLang(lang.code)"
                                    class="px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-colors"
                                    :style="form.settings.bill_language === lang.code
                                        ? 'border-color:#16A34A; background-color:#F0FDF4; color:#15803D;'
                                        : 'border-color:#E2E8F0; background-color:#F8FAFC; color:#334155;'"
                                >{{ lang.label }}</button>
                            </div>
                        </div>
                    </div>

                    <!-- Appearance card -->
                    <div class="bg-white rounded-xl shadow-sm p-5 space-y-5" style="border:1px solid #E2E8F0;">
                        <h2 class="font-semibold text-[15px]" style="color:#0F172A; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
                            {{ t('set.appearance') }}
                        </h2>

                        <!-- Sidebar Theme -->
                        <div>
                            <label class="block mb-3 text-xs font-semibold uppercase tracking-wide" style="color:#64748B;">{{ t('set.sidebar_theme') }}</label>
                            <div class="flex gap-3 flex-wrap">
                                <button
                                    v-for="preset in SIDEBAR_PRESETS"
                                    :key="preset.id"
                                    type="button"
                                    @click="selectSidebarTheme(preset.id)"
                                    class="relative w-10 h-10 rounded-full transition-all duration-150 focus:outline-none"
                                    :style="{
                                        backgroundColor: preset.bg,
                                        boxShadow: form.settings.sidebar_theme === preset.id
                                            ? '0 0 0 3px #fff, 0 0 0 5px ' + preset.active
                                            : '0 1px 3px rgba(0,0,0,0.3)',
                                        transform: form.settings.sidebar_theme === preset.id ? 'scale(1.18)' : 'scale(1)',
                                    }"
                                    :title="preset.label"
                                >
                                    <span
                                        class="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white"
                                        :style="{ backgroundColor: preset.active }"
                                    ></span>
                                </button>
                            </div>
                            <p class="mt-2 text-xs font-medium" style="color:#64748B;">
                                {{ SIDEBAR_PRESETS.find(p => p.id === form.settings.sidebar_theme)?.label }}
                            </p>
                        </div>

                        <!-- Primary Color -->
                        <div>
                            <label class="block mb-3 text-xs font-semibold uppercase tracking-wide" style="color:#64748B;">{{ t('set.primary_color') }}</label>
                            <div class="flex gap-3 flex-wrap">
                                <button
                                    v-for="preset in PRIMARY_PRESETS"
                                    :key="preset.id"
                                    type="button"
                                    @click="selectPrimaryColor(preset.id)"
                                    class="w-10 h-10 rounded-full transition-all duration-150 focus:outline-none flex items-center justify-center"
                                    :style="{
                                        backgroundColor: preset.color,
                                        boxShadow: form.settings.primary_color === preset.id
                                            ? '0 0 0 3px #fff, 0 0 0 5px ' + preset.color
                                            : '0 1px 3px rgba(0,0,0,0.25)',
                                        transform: form.settings.primary_color === preset.id ? 'scale(1.18)' : 'scale(1)',
                                    }"
                                    :title="preset.label"
                                >
                                    <svg v-if="form.settings.primary_color === preset.id" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                            </div>
                            <p class="mt-2 text-xs font-medium" style="color:#64748B;">
                                {{ PRIMARY_PRESETS.find(p => p.id === form.settings.primary_color)?.label }}
                            </p>
                        </div>
                    </div>

                    <!-- Barcode Label card -->
                    <div class="bg-white rounded-xl shadow-sm p-5 space-y-4" style="border:1px solid #E2E8F0;">
                        <h2 class="font-semibold text-[15px]" style="color:#0F172A; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
                            🏷 Barcode Label
                        </h2>

                        <!-- Label Size -->
                        <div>
                            <label class="block mb-2 text-xs font-semibold uppercase tracking-wide" style="color:#64748B;">Label Size</label>
                            <div class="grid grid-cols-2 gap-2">
                                <button
                                    v-for="s in BARCODE_SIZES"
                                    :key="s.id"
                                    type="button"
                                    @click="form.settings.barcode_label_size = s.id"
                                    class="px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors text-left"
                                    :style="form.settings.barcode_label_size === s.id
                                        ? 'border-color:#7C3AED; background:#F5F3FF; color:#6D28D9;'
                                        : 'border-color:#E2E8F0; background:#F8FAFC; color:#334155;'"
                                >
                                    <span class="font-semibold">{{ s.label }}</span>
                                    <span class="block text-xs mt-0.5 opacity-60">{{ s.desc }}</span>
                                </button>
                            </div>
                        </div>

                        <!-- Show Price toggle -->
                        <div class="flex items-center justify-between py-1">
                            <div>
                                <p class="text-sm font-medium" style="color:#334155;">Show Price on Label</p>
                                <p class="text-xs mt-0.5" style="color:#94A3B8;">Print selling price below the barcode</p>
                            </div>
                            <button
                                type="button"
                                @click="form.settings.barcode_show_price = !form.settings.barcode_show_price"
                                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                                :style="form.settings.barcode_show_price ? 'background:#7C3AED;' : 'background:#D1D5DB;'"
                            >
                                <span
                                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow"
                                    :class="form.settings.barcode_show_price ? 'translate-x-6' : 'translate-x-1'"
                                ></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Printer selector (Electron only) -->
            <div v-if="isElectron" class="mt-5 p-4 rounded-xl" style="background:#F8FAFC; border:1px solid #E2E8F0;">
                <h3 class="text-sm font-semibold mb-3" style="color:#334155;">🖨 Receipt Printer</h3>
                <div class="flex items-center gap-3">
                    <select
                        v-model="form.settings.printer_name"
                        class="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                        style="border:1px solid #E2E8F0; color:#0F172A;"
                    >
                        <option value="">— Select printer —</option>
                        <option v-for="p in printers" :key="p.name" :value="p.name">
                            {{ p.name }}{{ p.isDefault ? ' (Default)' : '' }}
                        </option>
                    </select>
                    <button
                        type="button"
                        @click="loadPrinters"
                        class="px-3 py-2 rounded-lg text-sm font-semibold"
                        style="background:#E2E8F0; color:#475569;"
                        title="Refresh printer list"
                    >↺</button>
                </div>
                <p v-if="form.settings.printer_name" class="mt-2 text-xs" style="color:#64748B;">
                    Selected: <strong>{{ form.settings.printer_name }}</strong>
                </p>
            </div>

            <!-- Database backup / restore (Electron only) -->
            <div v-if="isElectron" class="mt-5 p-4 rounded-xl" style="background:#F8FAFC; border:1px solid #E2E8F0;">
                <h3 class="text-sm font-semibold mb-1" style="color:#334155;">🗄 Database</h3>
                <p class="text-xs mb-3" style="color:#94A3B8;">Export a backup of your data, restore from a previous backup, or run pending migrations.</p>
                <div class="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        :disabled="dbBusy"
                        @click="exportDb"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style="background:#16A34A;"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Backup
                    </button>
                    <button
                        type="button"
                        :disabled="dbBusy"
                        @click="importDb"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style="background:#D97706;"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        Import Backup
                    </button>
                    <button
                        type="button"
                        :disabled="dbBusy"
                        @click="runMigrations"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                        style="background:#E2E8F0; color:#475569;"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Run Migrations
                    </button>
                </div>
                <div v-if="dbBusy" class="mt-2 text-xs" style="color:#64748B;">Processing…</div>
                <div
                    v-if="dbStatus"
                    class="mt-2 text-xs font-semibold px-3 py-2 rounded-lg"
                    :style="dbStatus.type === 'success' ? 'background:#F0FDF4; color:#16A34A;' : 'background:#FEF2F2; color:#DC2626;'"
                >{{ dbStatus.message }}</div>
            </div>

            <!-- Save button — full width below both columns -->
            <div class="mt-5">
                <button
                    type="submit"
                    :disabled="form.processing"
                    class="px-8 py-2.5 rounded-lg text-white font-semibold text-sm transition-opacity"
                    style="background-color:#2563EB;"
                    :style="form.processing ? 'opacity:0.7' : ''"
                >
                    {{ form.processing ? t('lbl.loading') : t('set.save') }}
                </button>
            </div>
        </form>
    </AuthenticatedLayout>
</template>

