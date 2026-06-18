<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, router } from '@inertiajs/vue3';
import { ref, watch, inject, nextTick, onMounted, onUnmounted } from 'vue';
import JsBarcode from 'jsbarcode';

const props = defineProps({
    products: { type: Object, default: () => ({ data: [], links: [], meta: {} }) },
    categories: { type: Array, default: () => [] },
    filters: { type: Object, default: () => ({}) },
});

const t = inject('t');

const search = ref(props.filters?.search || '');
const categoryId = ref(props.filters?.category_id || '');
const loading = ref(false);

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

watch([search, categoryId], () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        router.get(route('products.index'), {
            search: search.value,
            category_id: categoryId.value,
        }, { preserveState: true, replace: true });
    }, 400);
});

function formatCurrency(value) {
    return 'Rs. ' + Number(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function deleteProduct(id) {
    if (confirm(t('btn.delete') + '?')) {
        router.delete(route('products.destroy', id));
    }
}

const barcodeSvg = ref(null);
const barcodeProduct = ref(null);

function printBarcode(product) {
    barcodeProduct.value = product;
    nextTick(async () => {
        try {
            JsBarcode(barcodeSvg.value, product.barcode, {
                format: 'CODE128',
                displayValue: false,
                width: 1,
                height: 18,
                margin: 0,
            });
        } catch {}

        if (window.electronAPI?.printBarcode) {
            const printer = localStorage.getItem('pos_printer') || '';
            await window.electronAPI.printBarcode(printer);
        } else {
            window.print();
        }
        barcodeProduct.value = null;
    });
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
                            {{ product.stock_qty }} {{ product.unit }}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button
                        v-if="product.barcode"
                        @click="printBarcode(product)"
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
                        @click="deleteProduct(product.id)"
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
                                    {{ product.stock_qty }} {{ product.unit }}
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
                                        @click="printBarcode(product)"
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
                                        @click="deleteProduct(product.id)"
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

    <!-- Teleported to body so it's outside #app, allowing @media print to isolate it -->
    <Teleport to="body">
        <div v-if="barcodeProduct" id="barcode-print-area">
            <svg ref="barcodeSvg"></svg>
            <p class="barcode-name">{{ barcodeProduct.name }}</p>
            <p v-if="barcodeProduct.name_si" class="barcode-name-si">{{ barcodeProduct.name_si }}</p>
        </div>
    </Teleport>
</template>

<style>
#barcode-print-area { display: none; }
@media print {
    @page { size: 30mm 20mm; margin: 0; }
    body > * { display: none !important; }
    #barcode-print-area {
        display: flex !important;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 30mm;
        height: 20mm;
        padding: 1mm 1mm 1mm;
        font-family: sans-serif;
        overflow: hidden;
    }
    #barcode-print-area svg { display: block; width: 18mm !important; height: auto !important; }
    #barcode-print-area .barcode-name { margin: 1mm 0 0; font-size: 7pt; font-weight: bold; text-align: center; line-height: 1.1; max-width: 28mm; overflow: hidden; white-space: nowrap; }
    #barcode-print-area .barcode-name-si { margin: 0.5mm 0 0; font-size: 5.5pt; font-weight: bold; text-align: center; line-height: 1.1; max-width: 28mm; overflow: hidden; white-space: nowrap; }
}
</style>
