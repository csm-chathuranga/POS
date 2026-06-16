<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import { computed, ref, inject, nextTick } from 'vue';

const t = inject('t');

const props = defineProps({
    suppliers: { type: Array, default: () => [] },
    products: { type: Array, default: () => [] },
});

const today = new Date().toISOString().slice(0, 10);

const form = useForm({
    supplier_id: '',
    purchase_date: today,
    note: '',
    total: 0,
    items: [
        { product_id: '', qty: 1, cost_price: 0, total: 0 }
    ],
});

// Per-row search state
const searchQueries = ref(['']);
const openIndex = ref(null);

function filteredProducts(index) {
    const q = (searchQueries.value[index] || '').toLowerCase().trim();
    if (!q) return props.products.slice(0, 50);
    return props.products.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.name_si && p.name_si.includes(searchQueries.value[index].trim())) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 50);
}

function selectProduct(index, product) {
    form.items[index].product_id = product.id;
    form.items[index].cost_price = product.cost_price || 0;
    searchQueries.value[index] = product.name;
    openIndex.value = null;
}

function openSearch(index) {
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

function onSearchBlur(index) {
    // Delay close so click on dropdown item registers first
    setTimeout(() => {
        if (openIndex.value === index) openIndex.value = null;
        // If user blurred without selecting, restore the product name or clear
        const item = form.items[index];
        if (item.product_id) {
            const product = props.products.find(p => p.id == item.product_id);
            if (product) searchQueries.value[index] = product.name;
        } else {
            searchQueries.value[index] = '';
        }
    }, 200);
}

function getSelectedProduct(index) {
    return props.products.find(p => p.id == form.items[index].product_id) || null;
}

function addRow() {
    form.items.push({ product_id: '', qty: 1, cost_price: 0, total: 0 });
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

function submit() {
    form.items.forEach(item => {
        item.total = Number(item.qty || 0) * Number(item.cost_price || 0);
    });
    form.total = grandTotal.value;
    form.post(route('purchases.store'));
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

        <div class="max-w-4xl">
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
                                <option value="">{{ t('lbl.select_customer') }}</option>
                                <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                                    {{ supplier.name }}{{ supplier.company ? ` - ${supplier.company}` : '' }}
                                </option>
                            </select>
                            <p v-if="form.errors.supplier_id" class="text-red-500 text-xs mt-1">{{ form.errors.supplier_id }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('lbl.date') }} <span class="text-red-500">*</span></label>
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
                            <div class="col-span-5">{{ t('th.product') }}</div>
                            <div class="col-span-2 text-center">{{ t('th.qty') }}</div>
                            <div class="col-span-3">{{ t('th.cost') }} (Rs.)</div>
                            <div class="col-span-2 text-right">{{ t('lbl.total') }}</div>
                        </div>

                        <div
                            v-for="(item, index) in form.items"
                            :key="index"
                            class="grid grid-cols-12 gap-2 mb-2 items-start"
                        >
                            <!-- Product search -->
                            <div class="col-span-5 relative">
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
                                        placeholder="Search product..."
                                        class="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                        :class="{ 'border-red-500': form.errors[`items.${index}.product_id`] }"
                                        @focus="openSearch(index)"
                                        @blur="onSearchBlur(index)"
                                    />
                                </div>

                                <!-- Dropdown -->
                                <div v-if="openIndex === index && filteredProducts(index).length > 0"
                                    class="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
                                >
                                    <div
                                        v-for="product in filteredProducts(index)"
                                        :key="product.id"
                                        class="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0"
                                        @mousedown.prevent="selectProduct(index, product)"
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

                            <div class="col-span-2">
                                <input
                                    v-model="item.qty"
                                    type="number"
                                    min="1"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                />
                            </div>
                            <div class="col-span-3">
                                <input
                                    v-model="item.cost_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                />
                            </div>
                            <div class="col-span-1 text-right font-medium text-gray-700 text-sm pt-3">
                                {{ formatCurrency(item.qty * item.cost_price) }}
                            </div>
                            <div class="col-span-1 flex justify-end pt-2">
                                <button
                                    type="button"
                                    @click="removeRow(index)"
                                    :disabled="form.items.length === 1"
                                    class="text-red-400 hover:text-red-600 disabled:opacity-30 p-1"
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
                                            @focus="openSearch(index)"
                                            @blur="onSearchBlur(index)"
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
                                        class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                    />
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">{{ t('th.cost') }}</label>
                                    <input
                                        v-model="item.cost_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
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
    </AuthenticatedLayout>
</template>
