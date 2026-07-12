<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import { computed, ref, inject, nextTick, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { getProducts, invalidateProducts } from '@/stores/productCache';

const t = inject('t');
const numpadEnabled = inject('numpadEnabled', computed(() => false));
const openNumpad    = inject('openNumpad', () => {});

const props = defineProps({
    suppliers: { type: Array, default: () => [] },
});

const allProducts = ref([]);
const quickAddedProducts = ref([]);
const localProducts = computed(() => [...allProducts.value, ...quickAddedProducts.value]);

onMounted(async () => {
    allProducts.value = await getProducts();
});

const today = new Date().toISOString().slice(0, 10);

const form = useForm({
    supplier_id: '',
    purchase_date: today,
    note: '',
    total: 0,
    items: [
        { product_id: '', qty: 1, cost_price: 0, selling_price: 0, wholesale_price: 0, total: 0 }
    ],
});

// Per-row search state
const searchQueries = ref(['']);
const openIndex = ref(null);
const highlightIndex = ref(-1);

// Quick-add product modal
const showNewProductModal  = ref(false);
const newProductRowIndex   = ref(null);
const newProductSaving     = ref(false);
const newProductError      = ref('');
const newProductForm       = ref({
    name: '', name_si: '', barcode: '',
    cost_price: '', selling_price: '', wholesale_price: '', unit: 'pcs',
});

function openNewProductModal(index, barcode = '') {
    newProductRowIndex.value = index;
    newProductError.value    = '';
    newProductForm.value     = { name: '', name_si: '', barcode, cost_price: '', selling_price: '', wholesale_price: '', unit: 'pcs' };
    showNewProductModal.value = true;
    nextTick(() => document.getElementById('new-product-name')?.focus());
}

function modalFocusNext(currentId) {
    const order = ['new-product-name', 'new-product-name-si', 'new-product-barcode', 'new-product-unit',
                   'new-product-cost', 'new-product-selling', 'new-product-wholesale'];
    const idx = order.indexOf(currentId);
    if (idx !== -1 && idx < order.length - 1) {
        nextTick(() => document.getElementById(order[idx + 1])?.focus());
    } else {
        saveNewProduct();
    }
}

async function saveNewProduct() {
    newProductError.value = '';
    if (!newProductForm.value.name.trim()) { newProductError.value = 'Product name is required.'; return; }
    if (!newProductForm.value.selling_price) { newProductError.value = 'Selling price is required.'; return; }
    newProductSaving.value = true;
    try {
        // Get CSRF token from cookie for plain axios requests
        const token = document.cookie.split(';').map(c => c.trim())
            .find(c => c.startsWith('XSRF-TOKEN='))?.split('=')[1];
        const res = await axios.post('/products', { ...newProductForm.value, quick_create: true }, {
            headers: {
                'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            },
        });
        const product = res.data;
        const rowIndex = newProductRowIndex.value;
        // Close modal first
        showNewProductModal.value = false;
        await nextTick();
        // Add to local computed list
        quickAddedProducts.value = [...quickAddedProducts.value, product];
        await nextTick();
        // Pre-fill search with product name and open the dropdown for this row
        searchQueries.value[rowIndex] = product.name;
        openIndex.value = rowIndex;
        // Focus the search input
        const searchId = `search-${rowIndex}`;
        const searchEl = document.getElementById(searchId);
        if (searchEl) { searchEl.focus(); searchEl.select(); }
    } catch (err) {
        const errors = err.response?.data?.errors;
        if (errors) {
            newProductError.value = Object.values(errors).flat().join(' ');
        } else if (err.response?.data?.message) {
            newProductError.value = err.response.data.message;
        } else {
            newProductError.value = `Error ${err.response?.status ?? ''}: ${err.message}`;
        }
    } finally {
        newProductSaving.value = false;
    }
}

function filteredProducts(index) {
    const q = (searchQueries.value[index] || '').toLowerCase().trim();
    if (!q) return localProducts.value.slice(0, 50);
    return localProducts.value.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.name_si && p.name_si.includes(searchQueries.value[index].trim())) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 50);
}

function focusQty(index) {
    if (numpadEnabled.value) return; // numpad mode: user taps qty manually
    nextTick(() => {
        const el = document.getElementById(`qty-${index}`);
        if (el) { el.focus(); el.select(); }
    });
}

function selectProduct(index, product) {
    form.items.splice(index, 1, {
        ...form.items[index],
        product_id:      product.id,
        cost_price:      product.cost_price      || 0,
        selling_price:   product.selling_price   || 0,
        wholesale_price: product.wholesale_price || 0,
    });
    searchQueries.value[index] = product.name;
    openIndex.value = null;
    focusQty(index);
}

function focusField(id) {
    nextTick(() => {
        const el = document.getElementById(id);
        if (el) { el.focus(); el.select(); }
    });
}

function onQtyKeydown(index, e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    focusField(`cost-${index}`);
}

function onPriceKeydown(index, field, e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (field === 'cost')     { focusField(`selling-${index}`); return; }
    if (field === 'selling')  { focusField(`wholesale-${index}`); return; }
    if (field === 'wholesale') {
        addRow();
        const newIndex = form.items.length - 1;
        nextTick(() => {
            const el = document.getElementById(`search-${newIndex}`);
            if (el) el.focus();
        });
    }
}

function openSearch(index) {
    highlightIndex.value = -1;
    openIndex.value = index;
    // If already has a product selected, clear query to allow fresh search
    if (!form.items[index].product_id) {
        searchQueries.value[index] = '';
    }
}

function clearProduct(index) {
    form.items[index].product_id = '';
    form.items[index].cost_price = 0;
    searchQueries.value[index] = '';
    openIndex.value = index;
    nextTick(() => {
        document.getElementById(`search-${index}`)?.focus();
    });
}

function scrollHighlightedIntoView(index) {
    nextTick(() => {
        const dropdown = document.getElementById(`dropdown-${index}`);
        if (!dropdown) return;
        const items = dropdown.querySelectorAll('[data-dropdown-item]');
        items[highlightIndex.value]?.scrollIntoView({ block: 'nearest' });
    });
}

function onSearchKeydown(index, e) {
    const results = filteredProducts(index);

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        openIndex.value = index;
        highlightIndex.value = Math.min(highlightIndex.value + 1, results.length - 1);
        scrollHighlightedIntoView(index);
        return;
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightIndex.value = Math.max(highlightIndex.value - 1, -1);
        scrollHighlightedIntoView(index);
        return;
    }

    if (e.key === 'Escape') {
        openIndex.value = null;
        highlightIndex.value = -1;
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        // If an item is highlighted via arrow keys, select it
        if (highlightIndex.value >= 0 && results[highlightIndex.value]) {
            selectProduct(index, results[highlightIndex.value]);
            highlightIndex.value = -1;
            return;
        }
        const q = (searchQueries.value[index] || '').trim();
        if (!q) return;
        // Exact barcode match first
        let match = localProducts.value.find(p => p.barcode && p.barcode.toLowerCase() === q.toLowerCase());
        // Fall back to single result
        if (!match && results.length === 1) match = results[0];
        if (match) {
            selectProduct(index, match);
        } else {
            // No product found — open quick-add modal with the scanned barcode
            openIndex.value = null;
            openNewProductModal(index, q);
        }
        highlightIndex.value = -1;
    }
}

function onSearchBlur(index) {
    // Delay close so click on dropdown item registers first
    setTimeout(() => {
        if (openIndex.value === index) openIndex.value = null;
        // If user blurred without selecting, restore the product name or clear
        const item = form.items[index];
        if (item.product_id) {
            const product = localProducts.value.find(p => p.id == item.product_id);
            if (product) searchQueries.value[index] = product.name;
        } else {
            searchQueries.value[index] = '';
        }
    }, 200);
}

function getSelectedProduct(index) {
    return localProducts.value.find(p => p.id == form.items[index].product_id) || null;
}

function addRow() {
    form.items.push({ product_id: '', qty: 1, cost_price: 0, selling_price: 0, wholesale_price: 0, total: 0 });
    searchQueries.value.push('');
}

function removeRow(index) {
    if (form.items.length > 1) {
        form.items.splice(index, 1);
        searchQueries.value.splice(index, 1);
        if (openIndex.value === index) openIndex.value = null;
    }
}

const grandTotal = computed(() => {
    return form.items.reduce((sum, item) => {
        return sum + (Number(item.qty || 0) * Number(item.cost_price || 0));
    }, 0);
});

function formatCurrency(value) {
    return 'Rs. ' + Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function focusLastSearch() {
    const lastIndex = form.items.length - 1;
    // Focus the last unfilled search, or the last row
    const emptyIndex = form.items.findIndex(i => !i.product_id);
    const target = emptyIndex !== -1 ? emptyIndex : lastIndex;
    nextTick(() => {
        const el = document.getElementById(`search-${target}`);
        if (el) { el.focus(); el.select(); }
    });
}

function onGlobalKeydown(e) {
    if (e.key === 'F1') {
        e.preventDefault();
        focusLastSearch();
    }
    if (e.key === 'F10') {
        e.preventDefault();
        submit();
    }
}

onMounted(() => document.addEventListener('keydown', onGlobalKeydown));
onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown));

function submit() {
    form.items.forEach(item => {
        item.total = Number(item.qty || 0) * Number(item.cost_price || 0);
    });
    form.total = grandTotal.value;
    form.post(route('purchases.store'), {
        onSuccess: () => invalidateProducts(),
    });
}
</script>

<template>
    <Head :title="t('page.new_purchase')" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center gap-2">
                <Link :href="route('purchases.index')" class="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 class="text-xl font-bold text-gray-800">{{ t('page.new_purchase') }}</h1>
            </div>
        </template>

        <div>
            <form @submit.prevent="submit" class="space-y-4">

                <!-- Header Card -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 class="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">{{ t('lbl.general') }}</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('pur.supplier') }}</label>
                            <select
                                v-model="form.supplier_id"
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                :class="{ 'border-red-500': form.errors.supplier_id }"
                            >
                                <option value="">{{ t('pur.select_supplier') }}</option>
                                <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                                    {{ supplier.name }}{{ supplier.company ? ` - ${supplier.company}` : '' }}
                                </option>
                            </select>
                            <p v-if="form.errors.supplier_id" class="text-red-500 text-xs mt-1">{{ form.errors.supplier_id }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('lbl.date_time') }} <span class="text-red-500">*</span></label>
                            <input
                                v-model="form.purchase_date"
                                type="date"
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                :class="{ 'border-red-500': form.errors.purchase_date }"
                            />
                            <p v-if="form.errors.purchase_date" class="text-red-500 text-xs mt-1">{{ form.errors.purchase_date }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('lbl.note') }}</label>
                            <input
                                v-model="form.note"
                                type="text"
                                class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                :placeholder="t('lbl.optional')"
                            />
                        </div>
                    </div>
                </div>

                <!-- Items Card -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wider">{{ t('th.product') }}</h2>
                        <button
                            type="button"
                            @click="addRow"
                            class="inline-flex items-center bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            {{ t('btn.add') }}
                        </button>
                    </div>

                    <!-- Desktop layout -->
                    <div class="hidden md:block">
                        <div class="grid grid-cols-12 gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div class="col-span-3">{{ t('th.product') }}</div>
                            <div class="col-span-1 text-center">{{ t('th.qty') }}</div>
                            <div class="col-span-2">{{ t('th.cost') }} (Rs.)</div>
                            <div class="col-span-2">Selling (Rs.)</div>
                            <div class="col-span-2">Wholesale (Rs.)</div>
                            <div class="col-span-2 text-right">{{ t('lbl.total') }}</div>
                        </div>

                        <div
                            v-for="(item, index) in form.items"
                            :key="index"
                            class="grid grid-cols-12 gap-2 mb-2 items-start"
                        >
                            <!-- Product search -->
                            <div class="col-span-3 relative">
                                <!-- Selected product display -->
                                <div v-if="item.product_id && openIndex !== index"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] flex items-center justify-between cursor-pointer hover:border-blue-400 bg-white"
                                    :class="{ 'border-red-500': form.errors[`items.${index}.product_id`] }"
                                    @click="openSearch(index)"
                                >
                                    <div class="min-w-0">
                                        <div class="font-medium text-gray-800 truncate">{{ getSelectedProduct(index)?.name }}</div>
                                        <div v-if="getSelectedProduct(index)?.name_si" class="text-xs text-blue-600 truncate">{{ getSelectedProduct(index)?.name_si }}</div>
                                    </div>
                                    <button type="button" @click.stop="clearProduct(index)" class="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <!-- Search input -->
                                <div v-else class="relative">
                                    <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                                        </svg>
                                    </div>
                                    <input
                                        :id="`search-${index}`"
                                        v-model="searchQueries[index]"
                                        type="text"
                                        autocomplete="off"
                                        placeholder="Search or scan barcode...  [F1]"
                                        class="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                        :class="[{ 'border-red-500': form.errors[`items.${index}.product_id`] }, numpadEnabled ? 'cursor-pointer' : '']"
                                        :readonly="numpadEnabled"
                                        @focus="numpadEnabled ? $event.target.blur() : openSearch(index)"
                                        @click="numpadEnabled && openNumpad(searchQueries[index] || '', t('th.product'), v => { searchQueries[index] = v; openSearch(index); }, { raw: true })"
                                        @blur="numpadEnabled ? null : onSearchBlur(index)"
                                        @keydown="numpadEnabled ? null : onSearchKeydown(index, $event)"
                                    />
                                </div>

                                <!-- Dropdown -->
                                <div v-if="openIndex === index && filteredProducts(index).length > 0"
                                    :id="`dropdown-${index}`"
                                    class="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
                                >
                                    <div
                                        v-for="(product, pi) in filteredProducts(index)"
                                        :key="product.id"
                                        data-dropdown-item
                                        class="px-3 py-2 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                                        :class="pi === highlightIndex ? 'bg-blue-100' : 'hover:bg-blue-50'"
                                        @mousedown.prevent="selectProduct(index, product)"
                                        @mousemove="highlightIndex = pi"
                                    >
                                        <div class="text-sm font-medium text-gray-800">{{ product.name }}</div>
                                        <div v-if="product.name_si" class="text-xs text-blue-600">{{ product.name_si }}</div>
                                        <div class="text-xs text-gray-400 mt-0.5">
                                            Rs. {{ Number(product.cost_price || 0).toFixed(2) }}
                                            <span v-if="product.barcode" class="ml-2">· {{ product.barcode }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="openIndex === index && filteredProducts(index).length === 0"
                                    class="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-3 text-sm text-gray-500"
                                >
                                    No products found
                                </div>

                                <p v-if="form.errors[`items.${index}.product_id`]" class="text-red-500 text-xs mt-1">
                                    {{ form.errors[`items.${index}.product_id`] }}
                                </p>
                            </div>

                            <div class="col-span-1">
                                <input
                                    :id="`qty-${index}`"
                                    v-model="item.qty"
                                    type="number"
                                    min="1"
                                    class="purchase-qty-input w-full border border-gray-300 rounded-lg px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                    :readonly="numpadEnabled"
                                    :class="numpadEnabled ? 'cursor-pointer' : ''"
                                    @focus="numpadEnabled ? $event.target.blur() : $event.target.select()"
                                    @click="numpadEnabled && openNumpad(item.qty, t('th.qty'), v => { item.qty = parseFloat(v) || 1; })"
                                    @keydown="numpadEnabled ? null : onQtyKeydown(index, $event)"
                                />
                            </div>
                            <div class="col-span-2">
                                <input
                                    :id="`cost-${index}`"
                                    v-model="item.cost_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    class="w-full border border-gray-300 rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                    :readonly="numpadEnabled"
                                    :class="numpadEnabled ? 'cursor-pointer' : ''"
                                    @focus="numpadEnabled ? $event.target.blur() : $event.target.select()"
                                    @click="numpadEnabled && openNumpad(item.cost_price, t('prod.buy_price'), v => { item.cost_price = parseFloat(v) || 0; })"
                                    @keydown="numpadEnabled ? null : onPriceKeydown(index, 'cost', $event)"
                                />
                            </div>
                            <div class="col-span-2">
                                <input
                                    :id="`selling-${index}`"
                                    v-model="item.selling_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    class="w-full border border-gray-300 rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
                                    :class="[{ 'border-red-500': form.errors[`items.${index}.selling_price`] }, numpadEnabled ? 'cursor-pointer' : '']"
                                    :readonly="numpadEnabled"
                                    @focus="numpadEnabled ? $event.target.blur() : $event.target.select()"
                                    @click="numpadEnabled && openNumpad(item.selling_price, t('prod.sell_price'), v => item.selling_price = parseFloat(v) || 0)"
                                    @keydown="numpadEnabled ? null : onPriceKeydown(index, 'selling', $event)"
                                />
                            </div>
                            <div class="col-span-2">
                                <input
                                    :id="`wholesale-${index}`"
                                    v-model="item.wholesale_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    class="w-full border border-gray-300 rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                                    :class="[{ 'border-red-500': form.errors[`items.${index}.wholesale_price`] }, numpadEnabled ? 'cursor-pointer' : '']"
                                    :readonly="numpadEnabled"
                                    @focus="numpadEnabled ? $event.target.blur() : $event.target.select()"
                                    @click="numpadEnabled && openNumpad(item.wholesale_price, t('prod.wholesale_price'), v => item.wholesale_price = parseFloat(v) || 0)"
                                    @keydown="numpadEnabled ? null : onPriceKeydown(index, 'wholesale', $event)"
                                />
                            </div>
                            <div class="col-span-2 flex items-center justify-end gap-3 pt-1">
                                <span class="font-medium text-gray-700 text-sm flex-1 text-right">{{ formatCurrency(item.qty * item.cost_price) }}</span>
                                <button
                                    type="button"
                                    @click="removeRow(index)"
                                    :disabled="form.items.length === 1"
                                    class="text-red-400 hover:text-red-600 disabled:opacity-30 p-1 flex-shrink-0"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Mobile card layout -->
                    <div class="md:hidden space-y-3">
                        <div
                            v-for="(item, index) in form.items"
                            :key="index"
                            class="border border-gray-200 rounded-lg p-3 space-y-3"
                        >
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-medium text-gray-600">{{ index + 1 }}</span>
                                <button
                                    type="button"
                                    @click="removeRow(index)"
                                    :disabled="form.items.length === 1"
                                    class="text-red-400 hover:text-red-600 disabled:opacity-30"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div>
                                <label class="block text-xs text-gray-500 mb-1">{{ t('th.product') }}</label>
                                <div class="relative">
                                    <!-- Selected product display -->
                                    <div v-if="item.product_id && openIndex !== index"
                                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] flex items-center justify-between cursor-pointer"
                                        @click="openSearch(index)"
                                    >
                                        <div class="min-w-0">
                                            <div class="font-medium text-gray-800 truncate">{{ getSelectedProduct(index)?.name }}</div>
                                            <div v-if="getSelectedProduct(index)?.name_si" class="text-xs text-blue-600 truncate">{{ getSelectedProduct(index)?.name_si }}</div>
                                        </div>
                                        <button type="button" @click.stop="clearProduct(index)" class="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <!-- Search input -->
                                    <div v-else class="relative">
                                        <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                                            </svg>
                                        </div>
                                        <input
                                            :id="`search-m-${index}`"
                                            v-model="searchQueries[index]"
                                            type="text"
                                            autocomplete="off"
                                            placeholder="Search product..."
                                            class="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                            :class="numpadEnabled ? 'cursor-pointer' : ''"
                                            :readonly="numpadEnabled"
                                            @focus="numpadEnabled ? $event.target.blur() : openSearch(index)"
                                            @click="numpadEnabled && openNumpad(searchQueries[index] || '', t('th.product'), v => { searchQueries[index] = v; openSearch(index); }, { raw: true })"
                                            @blur="numpadEnabled ? null : onSearchBlur(index)"
                                        />
                                    </div>

                                    <!-- Dropdown -->
                                    <div v-if="openIndex === index && filteredProducts(index).length > 0"
                                        class="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                                    >
                                        <div
                                            v-for="product in filteredProducts(index)"
                                            :key="product.id"
                                            class="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0"
                                            @mousedown.prevent="selectProduct(index, product)"
                                        >
                                            <div class="text-sm font-medium text-gray-800">{{ product.name }}</div>
                                            <div v-if="product.name_si" class="text-xs text-blue-600">{{ product.name_si }}</div>
                                            <div class="text-xs text-gray-400 mt-0.5">Rs. {{ Number(product.cost_price || 0).toFixed(2) }}</div>
                                        </div>
                                    </div>
                                    <div v-if="openIndex === index && filteredProducts(index).length === 0"
                                        class="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-3 text-sm text-gray-500"
                                    >
                                        No products found
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">{{ t('th.qty') }}</label>
                                    <input
                                        v-model="item.qty"
                                        type="number"
                                        min="1"
                                        class="purchase-qty-input w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                        @focus="$event.target.select()"
                                        @keydown="onQtyKeydown(index, $event)"
                                    />
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">{{ t('th.cost') }} (Rs.)</label>
                                    <input
                                        v-model="item.cost_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                    />
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">Selling (Rs.) <span class="text-red-500">*</span></label>
                                    <input
                                        v-model="item.selling_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
                                    />
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">Wholesale (Rs.) <span class="text-red-500">*</span></label>
                                    <input
                                        v-model="item.wholesale_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                                    />
                                </div>
                            </div>
                            <div class="text-right font-semibold text-blue-600">
                                {{ formatCurrency(item.qty * item.cost_price) }}
                            </div>
                        </div>
                    </div>

                    <p v-if="form.errors.items" class="text-red-500 text-xs mt-2">{{ form.errors.items }}</p>
                </div>

                <!-- Totals & Submit Card -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="flex justify-between items-center mb-6">
                        <span class="text-lg font-semibold text-gray-800">{{ t('lbl.grand_total') }}</span>
                        <span class="text-2xl font-bold text-blue-600">{{ formatCurrency(grandTotal) }}</span>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            :disabled="form.processing"
                            class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-lg transition-colors min-h-[44px] flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            {{ form.processing ? t('lbl.loading') : t('btn.save') }}
                            <span class="ml-1 text-xs font-mono bg-white/20 px-1.5 py-0.5 rounded">F10</span>
                        </button>
                        <Link
                            :href="route('purchases.index')"
                            class="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors min-h-[44px] flex items-center justify-center"
                        >
                            {{ t('btn.cancel') }}
                        </Link>
                    </div>
                </div>
            </form>
        </div>
        <!-- Quick Add Product Modal -->
        <Teleport to="body">
            <div v-if="showNewProductModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showNewProductModal = false"></div>

                <!-- Panel -->
                <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" @click.stop>
                    <!-- Header -->
                    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <h3 class="text-base font-bold text-gray-800">Add New Product</h3>
                        </div>
                        <button type="button" @click="showNewProductModal = false" class="text-gray-400 hover:text-gray-600 p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="px-6 py-5 space-y-4">
                        <p v-if="newProductForm.barcode" class="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 font-mono">
                            Barcode: {{ newProductForm.barcode }}
                        </p>

                        <p v-if="newProductError" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ newProductError }}</p>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="col-span-2">
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Product Name <span class="text-red-500">*</span></label>
                                <input
                                    id="new-product-name"
                                    v-model="newProductForm.name"
                                    type="text"
                                    placeholder="English name"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    @keydown.enter.prevent="modalFocusNext('new-product-name')"
                                />
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">සිංහල නම</label>
                                <input
                                    id="new-product-name-si"
                                    v-model="newProductForm.name_si"
                                    type="text"
                                    placeholder="Sinhala name (optional)"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    @keydown.enter.prevent="modalFocusNext('new-product-name-si')"
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Barcode</label>
                                <input
                                    id="new-product-barcode"
                                    v-model="newProductForm.barcode"
                                    type="text"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    @keydown.enter.prevent="modalFocusNext('new-product-barcode')"
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Unit</label>
                                <select id="new-product-unit" v-model="newProductForm.unit"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    @keydown.enter.prevent="modalFocusNext('new-product-unit')"
                                >
                                    <option>pcs</option>
                                    <option>kg</option>
                                    <option>g</option>
                                    <option>L</option>
                                    <option>ml</option>
                                    <option>box</option>
                                    <option>pack</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cost (Rs.)</label>
                                <input id="new-product-cost" v-model="newProductForm.cost_price" type="number" step="0.01" min="0" placeholder="0.00"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    :readonly="numpadEnabled" :class="numpadEnabled ? 'cursor-pointer' : ''"
                                    @click="numpadEnabled && openNumpad(newProductForm.cost_price, 'Cost Price', v => newProductForm.cost_price = v)"
                                    @keydown.enter.prevent="numpadEnabled ? null : modalFocusNext('new-product-cost')" />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Selling (Rs.) <span class="text-red-500">*</span></label>
                                <input id="new-product-selling" v-model="newProductForm.selling_price" type="number" step="0.01" min="0" placeholder="0.00"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    :readonly="numpadEnabled" :class="numpadEnabled ? 'cursor-pointer' : ''"
                                    @click="numpadEnabled && openNumpad(newProductForm.selling_price, 'Selling Price', v => newProductForm.selling_price = v)"
                                    @keydown.enter.prevent="numpadEnabled ? null : modalFocusNext('new-product-selling')" />
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Wholesale (Rs.)</label>
                                <input id="new-product-wholesale" v-model="newProductForm.wholesale_price" type="number" step="0.01" min="0" placeholder="0.00"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    :readonly="numpadEnabled" :class="numpadEnabled ? 'cursor-pointer' : ''"
                                    @click="numpadEnabled && openNumpad(newProductForm.wholesale_price, 'Wholesale Price', v => newProductForm.wholesale_price = v)"
                                    @keydown.enter.prevent="numpadEnabled ? null : modalFocusNext('new-product-wholesale')" />
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="flex gap-3 px-6 py-4 border-t border-gray-100">
                        <button
                            type="button"
                            @click="saveNewProduct"
                            :disabled="newProductSaving"
                            class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <svg v-if="newProductSaving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            {{ newProductSaving ? 'Saving...' : 'Save Product' }}
                        </button>
                        <button type="button" @click="showNewProductModal = false"
                            class="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </AuthenticatedLayout>
</template>
