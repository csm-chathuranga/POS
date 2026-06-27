<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import { inject, ref, computed, nextTick } from 'vue';
import JsBarcode from 'jsbarcode';

const t = inject('t');

const props = defineProps({
    products:   { type: Object, default: () => ({ data: [] }) },
    filters:    { type: Object, default: () => ({}) },
});

const appSettings = computed(() => usePage().props.appSettings || {});
const showPrice   = computed(() => appSettings.value.barcode_show_price !== '0' && appSettings.value.barcode_show_price !== false);

const search = ref(props.filters.search || '');

function doSearch() {
    router.get(route('promotions.index'), { search: search.value || undefined }, { preserveState: true, replace: true });
}

function formatCurrency(value) {
    return 'Rs. ' + Number(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(val) {
    if (!val) return '—';
    return String(val).slice(0, 10);
}

// ── Barcode modal ──────────────────────────────────────────────
const barcodeModal    = ref(false);
const barcodeProduct  = ref(null);
const barcodeQty      = ref(1);
const modalBarcodeSvg = ref(null);
const printBarcodeSvg = ref(null);
const printing        = ref(false);
const printPromoPrice = ref(true); // show promo price on label

const currentSize = { w: '30mm', h: '20mm' };

function openBarcodeModal(product) {
    barcodeProduct.value = product;
    barcodeQty.value     = 1;
    printPromoPrice.value = true;
    barcodeModal.value   = true;
    nextTick(() => renderBarcode(modalBarcodeSvg.value));
}

function closeBarcodeModal() {
    barcodeModal.value   = false;
    barcodeProduct.value = null;
}

function renderBarcode(el) {
    if (!el || !barcodeProduct.value?.barcode) return;
    const targets = el?.length !== undefined ? Array.from(el) : [el];
    targets.forEach(svg => {
        if (!svg) return;
        try {
            JsBarcode(svg, barcodeProduct.value.barcode, {
                format: 'CODE128', displayValue: true,
                fontSize: 9, fontOptions: 'bold',
                textMargin: 1, width: 0.8, height: 20, margin: 1,
            });
            const w = svg.getAttribute('width');
            const h = svg.getAttribute('height');
            if (w && h) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        } catch {}
    });
}

async function doPrint() {
    printing.value = true;
    await nextTick();
    renderBarcode(printBarcodeSvg.value);
    await nextTick();
    document.documentElement.classList.add('barcode-printing');
    try {
        const printer = localStorage.getItem('pos_printer') || usePage().props.appSettings?.printer_name || '';
        for (let i = 0; i < barcodeQty.value; i++) {
            if (window.electronAPI?.printReceipt) {
                await window.electronAPI.printReceipt(printer);
            } else {
                window.print();
            }
        }
    } finally {
        document.documentElement.classList.remove('barcode-printing');
        printing.value = false;
    }
}

const printLabel = computed(() => {
    const p = barcodeProduct.value;
    if (!p) return '';
    if (printPromoPrice.value && p.promo_price) return `Rs. ${Number(p.promo_price).toFixed(2)}`;
    if (showPrice.value) return `Rs. ${Number(p.selling_price).toFixed(2)}`;
    return '';
});
</script>

<template>
    <Head title="Promotions" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center gap-2">
                <span class="text-xl">🏷</span>
                <h1 class="text-xl font-bold text-gray-800">Active Promotions</h1>
            </div>
        </template>

        <!-- Search bar -->
        <div class="flex items-center gap-3 mb-4">
            <div class="relative flex-1 max-w-sm">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                </svg>
                <input
                    v-model="search"
                    @keyup.enter="doSearch"
                    type="text"
                    placeholder="Search promotions…"
                    class="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
            </div>
            <button @click="doSearch" class="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">Search</button>
        </div>

        <!-- Empty state -->
        <div v-if="products.data.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div class="text-5xl mb-3">🏷</div>
            <p class="text-gray-500 font-medium">No active promotions found</p>
            <p class="text-gray-400 text-sm mt-1">Products with an active promo date range will appear here</p>
            <Link :href="route('products.index')" class="inline-flex mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">Go to Products</Link>
        </div>

        <!-- Table -->
        <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table class="w-full">
                <thead>
                    <tr class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-orange-50 border-b border-orange-100">
                        <th class="px-4 py-3">Product</th>
                        <th class="px-4 py-3">Barcode</th>
                        <th class="px-4 py-3">Category</th>
                        <th class="px-4 py-3">Original Price</th>
                        <th class="px-4 py-3">Promo Price</th>
                        <th class="px-4 py-3">Valid Period</th>
                        <th class="px-4 py-3">Stock</th>
                        <th class="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <tr
                        v-for="product in products.data"
                        :key="product.id"
                        class="hover:bg-orange-50/40 transition-colors"
                    >
                        <td class="px-4 py-3">
                            <p class="font-medium text-gray-900">{{ product.name }}</p>
                            <p v-if="product.name_si" class="text-xs text-gray-500">{{ product.name_si }}</p>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500 font-mono">{{ product.barcode }}</td>
                        <td class="px-4 py-3 text-sm text-gray-600">{{ product.category?.name || '—' }}</td>
                        <td class="px-4 py-3 text-sm text-gray-400 line-through">{{ formatCurrency(product.selling_price) }}</td>
                        <td class="px-4 py-3">
                            <span class="font-semibold text-orange-600 text-sm">{{ formatCurrency(product.promo_price) }}</span>
                            <span class="ml-1.5 text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                                {{ Math.round((1 - product.promo_price / product.selling_price) * 100) }}% OFF
                            </span>
                        </td>
                        <td class="px-4 py-3 text-xs text-gray-500">
                            <span class="text-green-600 font-medium">{{ fmtDate(product.promo_start_date) }}</span>
                            <span class="mx-1 text-gray-300">→</span>
                            <span class="text-red-500 font-medium">{{ fmtDate(product.promo_end_date) }}</span>
                        </td>
                        <td class="px-4 py-3 text-sm font-medium" :class="product.stock_qty <= product.alert_qty ? 'text-red-600' : 'text-gray-700'">
                            {{ product.stock_qty }} {{ product.unit }}
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center justify-end gap-2">
                                <button
                                    @click="openBarcodeModal(product)"
                                    class="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm font-medium px-3 py-1.5 rounded hover:bg-purple-50 min-h-[36px]"
                                    title="Print promo barcode"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                                    </svg>
                                    Print
                                </button>
                                <Link
                                    :href="route('products.edit', { product: product.id })"
                                    class="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 rounded hover:bg-blue-50 min-h-[36px] flex items-center"
                                >Edit</Link>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div v-if="products.last_page > 1" class="flex items-center justify-center gap-1 mt-4 flex-wrap">
            <template v-for="link in products.links" :key="link.label">
                <Link
                    v-if="link.url"
                    :href="link.url"
                    class="px-3 py-2 text-sm rounded-lg border transition-colors min-h-[44px] flex items-center"
                    :class="link.active ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
                    v-html="link.label"
                />
                <span v-else class="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-400 min-h-[44px] flex items-center" v-html="link.label" />
            </template>
        </div>

        <!-- Barcode modal -->
        <Teleport to="body">
            <div v-if="barcodeModal" class="promo-bc-backdrop" @click.self="closeBarcodeModal">
                <div class="promo-bc-modal">
                    <div class="promo-bc-header">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">🏷</div>
                            <div>
                                <h3 class="font-semibold text-gray-900 text-sm">Print Promo Barcode</h3>
                                <p class="text-xs text-gray-500">{{ barcodeProduct?.name }}</p>
                            </div>
                        </div>
                        <button @click="closeBarcodeModal" class="text-gray-400 hover:text-gray-600 p-1 rounded">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <div class="promo-bc-body">
                        <!-- Preview -->
                        <div>
                            <p class="promo-bc-label">Preview</p>
                            <div class="promo-bc-preview">
                                <p class="bc-name">{{ barcodeProduct?.name }}</p>
                                <svg ref="modalBarcodeSvg" style="max-width:100%;height:auto;"></svg>
                                <div v-if="printLabel" class="flex items-center gap-1.5 justify-center">
                                    <span v-if="printPromoPrice && barcodeProduct?.promo_price" class="text-gray-400 line-through" style="font-size:7pt;">Rs. {{ Number(barcodeProduct?.selling_price || 0).toFixed(2) }}</span>
                                    <span class="bc-promo-price">{{ printLabel }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Options -->
                        <div class="flex flex-col gap-4">
                            <!-- Price toggle -->
                            <div>
                                <p class="promo-bc-label">Price on Label</p>
                                <label class="flex items-center gap-2 cursor-pointer mt-1">
                                    <input type="checkbox" v-model="printPromoPrice" class="accent-orange-500" />
                                    <span class="text-sm text-gray-700">Show promo price</span>
                                </label>
                            </div>

                            <!-- Copies -->
                            <div>
                                <p class="promo-bc-label">Copies</p>
                                <div class="flex items-center gap-2 mt-1">
                                    <button @click="barcodeQty = Math.max(1, barcodeQty - 1)" class="bc-qty-btn">−</button>
                                    <input v-model.number="barcodeQty" type="number" min="1" max="999" class="bc-qty-input" />
                                    <button @click="barcodeQty = Math.min(999, barcodeQty + 1)" class="bc-qty-btn">+</button>
                                </div>
                                <div class="flex gap-1 mt-1">
                                    <button v-for="n in [1,5,10,20]" :key="n" @click="barcodeQty = n"
                                        :class="['bc-quick-btn', barcodeQty === n ? 'bc-quick-btn--active' : '']">{{ n }}</button>
                                </div>
                            </div>

                            <!-- Discount summary -->
                            <div v-if="barcodeProduct?.promo_price" class="rounded-lg bg-orange-50 border border-orange-200 p-2.5 text-sm">
                                <p class="text-orange-700 font-semibold">
                                    {{ Math.round((1 - barcodeProduct.promo_price / barcodeProduct.selling_price) * 100) }}% OFF
                                </p>
                                <p class="text-orange-600 text-xs mt-0.5">
                                    Save Rs. {{ Number(barcodeProduct.selling_price - barcodeProduct.promo_price).toFixed(2) }} per unit
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="promo-bc-footer">
                        <button @click="closeBarcodeModal" class="bc-btn-cancel">Cancel</button>
                        <button @click="doPrint" :disabled="printing" class="bc-btn-promo-print">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                            </svg>
                            {{ printing ? 'Printing…' : `Print ${barcodeQty} Label${barcodeQty > 1 ? 's' : ''}` }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Hidden print area -->
            <div v-if="printing" id="promo-print-area" :style="`--lw:${currentSize.w};--lh:${currentSize.h}`">
                <div class="bc-label-page">
                    <p class="bc-print-name">{{ barcodeProduct?.name }}</p>
                    <svg ref="printBarcodeSvg"></svg>
                    <div v-if="printLabel" class="bc-print-price-wrap">
                        <span v-if="printPromoPrice && barcodeProduct?.promo_price" class="bc-print-orig">Rs. {{ Number(barcodeProduct?.selling_price || 0).toFixed(2) }}</span>
                        <span class="bc-print-promo">{{ printLabel }}</span>
                    </div>
                </div>
            </div>
        </Teleport>
    </AuthenticatedLayout>
</template>

<style>
/* Modal */
.promo-bc-backdrop {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.promo-bc-modal {
    background: #fff; border-radius: 1rem; width: 100%; max-width: 480px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    display: flex; flex-direction: column; overflow: hidden;
}
.promo-bc-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid #f3f4f6;
}
.promo-bc-body {
    padding: 1.25rem;
    display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;
}
@media (max-width: 480px) { .promo-bc-body { grid-template-columns: 1fr; } }
.promo-bc-footer {
    padding: 1rem 1.25rem; border-top: 1px solid #f3f4f6;
    display: flex; justify-content: flex-end; gap: 0.75rem;
}
.promo-bc-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.25rem; }
.promo-bc-preview {
    background: #fff; border: 1.5px dashed #fed7aa; border-radius: 0.5rem;
    padding: 0.75rem 0.5rem;
    display: flex; flex-direction: column; align-items: center; gap: 3px; min-height: 90px;
}
.bc-promo-price { font-size: 9pt; font-weight: 800; color: #ea580c; text-align: center; }
.bc-btn-promo-print {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 1.25rem; border-radius: 0.5rem; border: none;
    background: #ea580c; color: #fff; font-size: 0.875rem; font-weight: 600;
    cursor: pointer; transition: background 0.15s;
}
.bc-btn-promo-print:hover:not(:disabled) { background: #c2410c; }
.bc-btn-promo-print:disabled { opacity: 0.6; cursor: not-allowed; }

/* Qty controls (reuse from Products/Index) */
.bc-qty-btn {
    width: 32px; height: 32px; border-radius: 0.5rem; border: 1.5px solid #e5e7eb;
    background: #f9fafb; font-size: 1.1rem; cursor: pointer; display: flex;
    align-items: center; justify-content: center; font-weight: 600; color: #374151;
}
.bc-qty-input {
    width: 56px; text-align: center; border: 1.5px solid #e5e7eb;
    border-radius: 0.5rem; padding: 0.3rem; font-size: 0.875rem; font-weight: 600;
    color: #111; outline: none;
}
.bc-qty-input:focus { border-color: #ea580c; }
.bc-quick-btn {
    flex: 1; padding: 0.25rem; border-radius: 0.4rem; border: 1.5px solid #e5e7eb;
    font-size: 0.75rem; font-weight: 500; background: #f9fafb; cursor: pointer; color: #374151;
}
.bc-quick-btn--active { border-color: #ea580c; background: #fff7ed; color: #c2410c; }
.bc-btn-cancel {
    padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1.5px solid #e5e7eb;
    background: #fff; color: #374151; font-size: 0.875rem; font-weight: 500; cursor: pointer;
}

/* Print */
#promo-print-area { display: none; }
@media print {
    html:not(.barcode-printing) #promo-print-area { display: none !important; }
    html.barcode-printing body > * { display: none !important; }
    html.barcode-printing #promo-print-area { display: block !important; }

    @page { size: 30mm 20mm; margin: 0; }

    html.barcode-printing .bc-label-page {
        width: 30mm; height: 20mm;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 0.5mm; padding: 1mm; margin: 0;
        font-family: sans-serif; overflow: hidden; box-sizing: border-box;
    }
    html.barcode-printing .bc-print-name {
        font-size: 6pt; font-weight: 700; text-align: center;
        color: #000; line-height: 1.2; margin: 0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    html.barcode-printing .bc-label-page svg {
        display: block;
        width: auto !important; max-width: 100% !important; height: auto !important;
    }
    html.barcode-printing .bc-print-price-wrap {
        display: flex; align-items: center; justify-content: center; gap: 2mm;
    }
    html.barcode-printing .bc-print-orig {
        font-size: 6pt; font-weight: 600; color: #94a3b8;
        text-decoration: line-through; margin: 0;
    }
    html.barcode-printing .bc-print-promo {
        font-size: 8pt; font-weight: 800; color: #ea580c; margin: 0;
    }
}
</style>
