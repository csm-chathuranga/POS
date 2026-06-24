<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import ConfirmModal from '@/Components/ConfirmModal.vue';
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import { ref, watch, inject, nextTick, computed, onMounted, onUnmounted } from 'vue';
import JsBarcode from 'jsbarcode';

const props = defineProps({
    products: { type: Object, default: () => ({ data: [], links: [], meta: {} }) },
    categories: { type: Array, default: () => [] },
    filters: { type: Object, default: () => ({}) },
});

const t = inject('t');

const search    = ref(props.filters?.search     || '');
const categoryId = ref(props.filters?.category_id || '');
const lowStock  = ref(props.filters?.low_stock === '1' || props.filters?.low_stock === true);
const loading   = ref(false);

// ── CSV Import ────────────────────────────────────────────────────────────────
const importInput    = ref(null);
const importBusy     = ref(false);

function triggerImport() { importInput.value?.click(); }

function onImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    importBusy.value = true;
    const form = new FormData();
    form.append('file', file);
    router.post(route('products.import'), form, {
        forceFormData: true,
        onFinish: () => {
            importBusy.value = false;
            e.target.value = '';
        },
    });
}

let removeStart, removeFinish;
onMounted(() => {
    removeStart = router.on('start', () => { loading.value = true; });
    removeFinish = router.on('finish', () => { loading.value = false; });
});
onUnmounted(() => {
    removeStart?.();
    removeFinish?.();
});

let searchTimer = null;

watch([search, categoryId, lowStock], () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        router.get(route('products.index'), {
            search:      search.value,
            category_id: categoryId.value,
            low_stock:   lowStock.value ? '1' : '',
        }, { preserveState: true, replace: true });
    }, 400);
});

function formatCurrency(value) {
    return 'Rs. ' + Number(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(val) {
    return parseFloat(Number(val || 0).toFixed(3)).toString();
}

const deleteTarget = ref(null);
const deleting = ref(false);

function promptDelete(id, name) {
    deleteTarget.value = { id, name };
}

function doDelete() {
    deleting.value = true;
    router.delete(route('products.destroy', deleteTarget.value.id), {
        onFinish: () => { deleting.value = false; deleteTarget.value = null; },
    });
}

// Barcode modal state
const barcodeModal    = ref(false);
const barcodeProduct  = ref(null);
const barcodeQty      = ref(1);
const modalBarcodeSvg = ref(null);
const printBarcodeSvg = ref(null);
const printing        = ref(false);

const LABEL_SIZES = {
    '20x30': { w: '20mm', h: '30mm' },
    '40x25': { w: '40mm', h: '25mm' },
    '50x30': { w: '50mm', h: '30mm' },
    '58x40': { w: '58mm', h: '40mm' },
};

const appSettings  = computed(() => usePage().props.appSettings || {});
const labelSize    = computed(() => appSettings.value.barcode_label_size || '40x25');
const showPrice    = computed(() => appSettings.value.barcode_show_price !== '0' && appSettings.value.barcode_show_price !== false);
const currentSize  = computed(() => LABEL_SIZES[labelSize.value] || LABEL_SIZES['40x25']);

function openBarcodeModal(product) {
    barcodeProduct.value = product;
    barcodeQty.value = 1;
    barcodeModal.value = true;
    nextTick(() => renderBarcode(modalBarcodeSvg.value));
}

function closeBarcodeModal() {
    barcodeModal.value = false;
    barcodeProduct.value = null;
}

function renderBarcode(el) {
    if (!el || !barcodeProduct.value?.barcode) return;
    try {
        JsBarcode(el, barcodeProduct.value.barcode, {
            format: 'CODE128',
            displayValue: true,
            fontSize: 9,
            textMargin: 2,
            width: 1.4,
            height: 28,
            margin: 2,
        });
    } catch {}
}

async function doPrint() {
    printing.value = true;
    await nextTick();
    renderBarcode(printBarcodeSvg.value);
    await nextTick();
    document.documentElement.classList.add('barcode-printing');
    try {
        if (window.electronAPI?.printBarcode) {
            const printer = localStorage.getItem('pos_printer') || usePage().props.appSettings?.printer_name || '';
            console.log('[Barcode Print] printer:', printer || '(default)');
            await window.electronAPI.printBarcode(printer);
        } else {
            window.print();
        }
    } finally {
        document.documentElement.classList.remove('barcode-printing');
        printing.value = false;
    }
}
</script>

<template>
    <Head :title="t('page.products')" />

    <AuthenticatedLayout>
        <template #header>
            <h1 class="text-xl font-bold text-gray-800">{{ t('page.products') }}</h1>
        </template>

        <!-- Filters & Actions -->
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
            <div class="flex-1 relative">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    v-model="search"
                    type="text"
                    :placeholder="t('pos.search_product')"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
            </div>
            <select
                v-model="categoryId"
                class="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
                <option value="">{{ t('lbl.all') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
            <button
                type="button"
                @click="lowStock = !lowStock"
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border min-h-[44px] whitespace-nowrap transition-colors"
                :class="lowStock
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                Low Stock
            </button>
            <!-- Import CSV -->
            <input ref="importInput" type="file" accept=".csv,.txt" class="hidden" @change="onImportFile" />
            <button
                type="button"
                @click="triggerImport"
                :disabled="importBusy"
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border min-h-[44px] whitespace-nowrap transition-colors bg-white border-gray-300 text-gray-600 hover:border-green-500 hover:text-green-700"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {{ importBusy ? 'Importing…' : 'Import CSV' }}
            </button>
            <a
                :href="route('products.import.sample')"
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border min-h-[44px] whitespace-nowrap transition-colors bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Sample CSV
            </a>

            <Link
                :href="route('products.create')"
                class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                {{ t('btn.new_product') }}
            </Link>
        </div>

        <!-- Mobile card list -->
        <div class="md:hidden space-y-3 mb-4">
            <!-- Skeleton cards -->
            <template v-if="loading">
                <div v-for="i in 6" :key="'sk-'+i" class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
                    <div class="flex justify-between items-start mb-3">
                        <div class="space-y-2">
                            <div class="h-4 w-36 bg-gray-200 rounded"></div>
                            <div class="h-3 w-24 bg-gray-100 rounded"></div>
                        </div>
                        <div class="h-5 w-14 bg-gray-200 rounded-full"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        <div v-for="j in 3" :key="j" class="space-y-1">
                            <div class="h-2.5 w-12 bg-gray-100 rounded"></div>
                            <div class="h-4 w-16 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <div class="flex-1 h-10 bg-gray-100 rounded-lg"></div>
                        <div class="flex-1 h-10 bg-gray-100 rounded-lg"></div>
                    </div>
                </div>
            </template>
            <template v-else>
            <div v-if="products.data?.length === 0" class="bg-white rounded-xl p-6 text-center text-gray-400">
                {{ t('prod.no_products') }}
            </div>
            <div
                v-for="product in products.data"
                :key="product.id"
                class="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-semibold text-gray-900">{{ product.name }}</p>
                        <p v-if="product.name_si" class="text-sm text-gray-500">{{ product.name_si }}</p>
                        <p class="text-xs text-gray-400 mt-1">{{ product.barcode }}</p>
                    </div>
                    <span
                        class="text-xs font-medium px-2 py-1 rounded-full"
                        :class="product.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                    >
                        {{ product.active ? t('lbl.active') : t('lbl.inactive') }}
                    </span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div>
                        <p class="text-gray-400 text-xs">{{ t('th.category') }}</p>
                        <p class="font-medium text-gray-700">{{ product.category?.name || '-' }}</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-xs">{{ t('th.sell_price') }}</p>
                        <p class="font-medium text-green-600">{{ formatCurrency(product.selling_price) }}</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-xs">{{ t('th.stock') }}</p>
                        <p class="font-medium" :class="product.stock_qty <= product.alert_qty ? 'text-red-600' : 'text-gray-700'">
                            {{ fmtQty(product.stock_qty) }} {{ product.unit }}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button
                        v-if="product.barcode"
                        @click="openBarcodeModal(product)"
                        class="bg-purple-50 hover:bg-purple-100 text-purple-600 py-2 px-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center"
                        title="Print Barcode"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                    </button>
                    <Link
                        :href="route('products.edit', product.id)"
                        class="flex-1 text-center bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {{ t('btn.edit') }}
                    </Link>
                    <button
                        @click="promptDelete(product.id, product.name)"
                        class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {{ t('btn.delete') }}
                    </button>
                </div>
            </div>
            </template>
        </div>

        <!-- Desktop table -->
        <div class="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                            <th class="px-4 py-3">{{ t('th.product') }}</th>
                            <th class="px-4 py-3">{{ t('th.barcode') }}</th>
                            <th class="px-4 py-3">{{ t('th.category') }}</th>
                            <th class="px-4 py-3">{{ t('th.sell_price') }}</th>
                            <th class="px-4 py-3">{{ t('th.stock') }}</th>
                            <th class="px-4 py-3">{{ t('th.status') }}</th>
                            <th class="px-4 py-3 text-right">{{ t('th.actions') }}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <!-- Skeleton rows -->
                        <template v-if="loading">
                            <tr v-for="i in 8" :key="'sk-'+i" class="animate-pulse">
                                <td class="px-4 py-3">
                                    <div class="h-4 w-40 bg-gray-200 rounded mb-1.5"></div>
                                    <div class="h-3 w-28 bg-gray-100 rounded"></div>
                                </td>
                                <td class="px-4 py-3"><div class="h-4 w-28 bg-gray-200 rounded"></div></td>
                                <td class="px-4 py-3"><div class="h-4 w-20 bg-gray-200 rounded"></div></td>
                                <td class="px-4 py-3"><div class="h-4 w-20 bg-gray-200 rounded"></div></td>
                                <td class="px-4 py-3"><div class="h-4 w-16 bg-gray-200 rounded"></div></td>
                                <td class="px-4 py-3"><div class="h-5 w-14 bg-gray-200 rounded-full"></div></td>
                                <td class="px-4 py-3">
                                    <div class="flex justify-end gap-2">
                                        <div class="h-8 w-8 bg-gray-200 rounded"></div>
                                        <div class="h-8 w-16 bg-gray-200 rounded"></div>
                                        <div class="h-8 w-16 bg-gray-200 rounded"></div>
                                    </div>
                                </td>
                            </tr>
                        </template>
                        <template v-else>
                        <tr v-if="products.data?.length === 0">
                            <td colspan="7" class="px-4 py-8 text-center text-gray-400">{{ t('prod.no_products') }}</td>
                        </tr>
                        <tr
                            v-for="product in products.data"
                            :key="product.id"
                            class="hover:bg-gray-50 transition-colors"
                        >
                            <td class="px-4 py-3">
                                <p class="font-medium text-gray-900">{{ product.name }}</p>
                                <p v-if="product.name_si" class="text-xs text-gray-500">{{ product.name_si }}</p>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-500 font-mono">{{ product.barcode }}</td>
                            <td class="px-4 py-3 text-sm text-gray-600">{{ product.category?.name || '-' }}</td>
                            <td class="px-4 py-3 font-medium text-green-600">{{ formatCurrency(product.selling_price) }}</td>
                            <td class="px-4 py-3">
                                <span
                                    class="font-medium"
                                    :class="product.stock_qty <= product.alert_qty ? 'text-red-600' : 'text-gray-700'"
                                >
                                    {{ fmtQty(product.stock_qty) }} {{ product.unit }}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <span
                                    class="text-xs font-medium px-2 py-1 rounded-full"
                                    :class="product.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                                >
                                    {{ product.active ? t('lbl.active') : t('lbl.inactive') }}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex items-center justify-end gap-2">
                                    <button
                                        v-if="product.barcode"
                                        @click="openBarcodeModal(product)"
                                        class="text-purple-600 hover:text-purple-800 px-2 py-1.5 rounded hover:bg-purple-50 min-h-[36px] flex items-center"
                                        title="Print Barcode"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                    </button>
                                    <Link
                                        :href="route('products.edit', product.id)"
                                        class="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1.5 rounded hover:bg-blue-50 min-h-[36px] flex items-center gap-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        {{ t('btn.edit') }}
                                    </Link>
                                    <button
                                        @click="promptDelete(product.id, product.name)"
                                        class="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1.5 rounded hover:bg-red-50 min-h-[36px] flex items-center gap-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        {{ t('btn.delete') }}
                                    </button>
                                </div>
                            </td>
                        </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Pagination -->
        <div v-if="products.links?.length > 3" class="flex flex-wrap justify-center gap-1">
            <template v-for="link in products.links" :key="link.label">
                <Link
                    v-if="link.url"
                    :href="link.url"
                    class="px-3 py-2 text-sm rounded-lg border transition-colors min-h-[44px] flex items-center"
                    :class="link.active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
                    v-html="link.label"
                />
                <span
                    v-else
                    class="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-400 min-h-[44px] flex items-center"
                    v-html="link.label"
                />
            </template>
        </div>
    </AuthenticatedLayout>

    <ConfirmModal
        :show="!!deleteTarget"
        title="Delete Product"
        :message="`Are you sure you want to delete &quot;${deleteTarget?.name}&quot;? This cannot be undone.`"
        confirm-label="Delete Product"
        :busy="deleting"
        @confirm="doDelete"
        @cancel="deleteTarget = null"
    />

    <!-- Barcode Print Modal -->
    <Teleport to="body">
        <!-- Backdrop -->
        <div v-if="barcodeModal" class="barcode-modal-backdrop" @click.self="closeBarcodeModal">
            <div class="barcode-modal">
                <!-- Header -->
                <div class="barcode-modal-header">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900 text-sm">Print Barcode Label</h3>
                            <p class="text-xs text-gray-500">{{ barcodeProduct?.name }}</p>
                        </div>
                    </div>
                    <button @click="closeBarcodeModal" class="text-gray-400 hover:text-gray-600 p-1 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="barcode-modal-body">
                    <!-- Preview -->
                    <div class="barcode-preview-wrap">
                        <p class="barcode-section-label">Preview</p>
                        <div class="barcode-label-preview">
                            <svg ref="modalBarcodeSvg"></svg>
                            <p class="bc-name">{{ barcodeProduct?.name }}</p>
                            <p v-if="barcodeProduct?.name_si" class="bc-name-si">{{ barcodeProduct?.name_si }}</p>
                            <p v-if="showPrice" class="bc-price">Rs. {{ Number(barcodeProduct?.selling_price || 0).toFixed(2) }}</p>
                        </div>
                        <p class="text-xs text-gray-400 mt-2 text-center">
                            {{ labelSize }} mm · {{ showPrice ? 'with price' : 'no price' }}
                            · <Link :href="route('settings.index')" class="text-purple-600 hover:underline">change in Settings</Link>
                        </p>
                    </div>

                    <!-- Copies only -->
                    <div class="barcode-options">
                        <div class="bc-option-group">
                            <label class="barcode-section-label">Copies</label>
                            <div class="bc-qty-row">
                                <button @click="barcodeQty = Math.max(1, barcodeQty - 1)" class="bc-qty-btn">−</button>
                                <input v-model.number="barcodeQty" type="number" min="1" max="999" class="bc-qty-input" />
                                <button @click="barcodeQty = Math.min(999, barcodeQty + 1)" class="bc-qty-btn">+</button>
                            </div>
                            <div class="bc-quick-qty">
                                <button v-for="n in [1,5,10,20]" :key="n" @click="barcodeQty = n"
                                    :class="['bc-quick-btn', barcodeQty === n ? 'bc-quick-btn--active' : '']">{{ n }}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="barcode-modal-footer">
                    <button @click="closeBarcodeModal" class="bc-btn-cancel">Cancel</button>
                    <button @click="doPrint" :disabled="printing" class="bc-btn-print">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        {{ printing ? 'Printing...' : `Print ${barcodeQty} Label${barcodeQty > 1 ? 's' : ''}` }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Hidden print-only area (rendered when printing) -->
        <div v-if="printing" id="barcode-print-area"
            :style="`--lw:${currentSize.w};--lh:${currentSize.h}`">
            <template v-for="n in barcodeQty" :key="n">
                <div class="bc-label-page">
                    <svg ref="printBarcodeSvg"></svg>
                    <p class="bc-print-name">{{ barcodeProduct?.name }}</p>
                    <p v-if="barcodeProduct?.name_si" class="bc-print-name-si">{{ barcodeProduct?.name_si }}</p>
                    <p v-if="showPrice" class="bc-print-price">Rs. {{ Number(barcodeProduct?.selling_price || 0).toFixed(2) }}</p>
                </div>
            </template>
        </div>
    </Teleport>
</template>

<style>
/* ── Modal ── */
.barcode-modal-backdrop {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
}
.barcode-modal {
    background: #fff; border-radius: 1rem;
    width: 100%; max-width: 480px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    display: flex; flex-direction: column;
    overflow: hidden;
}
.barcode-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #f3f4f6;
}
.barcode-modal-body {
    padding: 1.25rem;
    display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;
}
@media (max-width: 480px) {
    .barcode-modal-body { grid-template-columns: 1fr; }
}
.barcode-modal-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid #f3f4f6;
    display: flex; justify-content: flex-end; gap: 0.75rem;
}

/* ── Preview ── */
.barcode-preview-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
.barcode-section-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.25rem; }
.barcode-label-preview {
    background: #fff;
    border: 1.5px dashed #d1d5db;
    border-radius: 0.5rem;
    padding: 0.75rem 0.5rem;
    display: flex; flex-direction: column; align-items: center;
    gap: 3px;
    min-height: 90px;
}
.barcode-label-preview svg { max-width: 100%; height: auto; }
.bc-name { font-size: 8pt; font-weight: 700; text-align: center; color: #111; line-height: 1.2; }
.bc-name-si { font-size: 7pt; font-weight: 600; text-align: center; color: #374151; }
.bc-price { font-size: 9pt; font-weight: 800; color: #16a34a; text-align: center; }

/* ── Options ── */
.barcode-options { display: flex; flex-direction: column; gap: 1rem; }
.bc-option-group { display: flex; flex-direction: column; gap: 0.4rem; }
.bc-size-grid { display: flex; flex-direction: column; gap: 0.3rem; }
.bc-size-btn {
    padding: 0.35rem 0.6rem; border-radius: 0.5rem; border: 1.5px solid #e5e7eb;
    font-size: 0.75rem; font-weight: 500; color: #374151; background: #f9fafb;
    cursor: pointer; text-align: left; transition: all 0.15s;
}
.bc-size-btn--active { border-color: #7c3aed; background: #f5f3ff; color: #6d28d9; font-weight: 600; }
.bc-qty-row { display: flex; align-items: center; gap: 0.5rem; }
.bc-qty-btn {
    width: 32px; height: 32px; border-radius: 0.5rem; border: 1.5px solid #e5e7eb;
    background: #f9fafb; font-size: 1.1rem; cursor: pointer; display: flex;
    align-items: center; justify-content: center; font-weight: 600; color: #374151;
    transition: background 0.15s;
}
.bc-qty-btn:hover { background: #f3f4f6; }
.bc-qty-input {
    width: 56px; text-align: center; border: 1.5px solid #e5e7eb;
    border-radius: 0.5rem; padding: 0.3rem; font-size: 0.875rem; font-weight: 600;
    color: #111; outline: none;
}
.bc-qty-input:focus { border-color: #7c3aed; }
.bc-quick-qty { display: flex; gap: 0.3rem; margin-top: 0.3rem; }
.bc-quick-btn {
    flex: 1; padding: 0.25rem; border-radius: 0.4rem; border: 1.5px solid #e5e7eb;
    font-size: 0.75rem; font-weight: 500; background: #f9fafb; cursor: pointer;
    color: #374151; transition: all 0.15s;
}
.bc-quick-btn--active { border-color: #7c3aed; background: #f5f3ff; color: #6d28d9; }
.bc-toggle-row { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }

/* ── Footer buttons ── */
.bc-btn-cancel {
    padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1.5px solid #e5e7eb;
    background: #fff; color: #374151; font-size: 0.875rem; font-weight: 500;
    cursor: pointer; transition: background 0.15s;
}
.bc-btn-cancel:hover { background: #f9fafb; }
.bc-btn-print {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 1.25rem; border-radius: 0.5rem; border: none;
    background: #7c3aed; color: #fff; font-size: 0.875rem; font-weight: 600;
    cursor: pointer; transition: background 0.15s;
}
.bc-btn-print:hover:not(:disabled) { background: #6d28d9; }
.bc-btn-print:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Print area ── */
#barcode-print-area { display: none; }
@media print {
    html:not(.barcode-printing) #barcode-print-area { display: none !important; }

    html.barcode-printing body > * { display: none !important; }
    html.barcode-printing #barcode-print-area { display: block !important; }
    html.barcode-printing .bc-label-page {
        width: var(--lw, 40mm);
        height: var(--lh, 25mm);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 1mm;
        font-family: sans-serif;
        overflow: hidden;
        page-break-after: always;
    }
    html.barcode-printing .bc-label-page svg { display: block; max-width: calc(var(--lw, 40mm) - 4mm) !important; height: auto !important; }
    html.barcode-printing .bc-print-name { margin: 0.5mm 0 0; font-size: 7pt; font-weight: 700; text-align: center; line-height: 1.2; max-width: calc(var(--lw, 40mm) - 2mm); overflow: hidden; white-space: nowrap; }
    html.barcode-printing .bc-print-name-si { font-size: 6pt; font-weight: 600; text-align: center; line-height: 1.2; max-width: calc(var(--lw, 40mm) - 2mm); overflow: hidden; white-space: nowrap; }
    html.barcode-printing .bc-print-price { margin: 0.5mm 0 0; font-size: 8pt; font-weight: 800; color: #000; text-align: center; }
}

@media print {
    html.barcode-printing { --lw: 40mm; --lh: 25mm; }
}
/* @page size is set per-print via Electron pageSize option; no global @page rule here */
</style>
