<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, router } from '@inertiajs/vue3';
import { ref, inject } from 'vue';

const t = inject('t');

const props = defineProps({
    products:   { type: Object, default: () => ({ data: [], links: [], meta: {} }) },
    summary:    { type: Object, default: () => ({}) },
    categories: { type: Array,  default: () => [] },
    filters:    { type: Object, default: () => ({}) },
});

const search     = ref(props.filters.search     || '');
const categoryId = ref(props.filters.category_id || '');
const status     = ref(props.filters.status      || '');

function applyFilters() {
    router.get(route('reports.stock-summary'), {
        search:      search.value      || undefined,
        category_id: categoryId.value  || undefined,
        status:      status.value      || undefined,
    }, { preserveState: true, replace: true });
}

function resetFilters() {
    search.value     = '';
    categoryId.value = '';
    status.value     = '';
    applyFilters();
}

function fmt(v) {
    return 'Rs. ' + Number(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(v, unit) {
    const n = Number(v || 0);
    return n % 1 === 0 ? n.toLocaleString('en-LK') + (unit ? ' ' + unit : '') : n.toFixed(2) + (unit ? ' ' + unit : '');
}

function stockStatus(product) {
    if (product.stock_qty <= 0)                          return { label: 'Out', cls: 'bg-red-100 text-red-700' };
    if (product.stock_qty <= product.alert_qty)          return { label: 'Low', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'OK', cls: 'bg-green-100 text-green-700' };
}
</script>

<template>
    <Head title="Stock Summary" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <Link :href="route('reports.index')" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 class="text-xl font-bold text-gray-800">Stock Summary</h1>
                </div>
                <button @click="window.print()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors print:hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                </button>
            </div>
        </template>

        <!-- Summary cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 print:hidden">
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Products</p>
                <p class="text-2xl font-extrabold text-slate-800">{{ Number(summary.total_products || 0).toLocaleString() }}</p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Units</p>
                <p class="text-2xl font-extrabold text-slate-800">{{ Number(summary.total_units || 0).toLocaleString() }}</p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Stock Cost Value</p>
                <p class="text-2xl font-extrabold text-blue-700">{{ fmt(summary.total_cost_value) }}</p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Retail Value</p>
                <p class="text-2xl font-extrabold text-green-700">{{ fmt(summary.total_retail_value) }}</p>
            </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-4 print:hidden">
            <div class="flex flex-wrap gap-2 items-end">
                <div class="flex-1 min-w-[180px]">
                    <input
                        v-model="search"
                        type="text"
                        placeholder="Search by name, SKU, barcode…"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        @keydown.enter="applyFilters"
                    />
                </div>
                <div class="min-w-[150px]">
                    <select
                        v-model="categoryId"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        @change="applyFilters"
                    >
                        <option value="">All Categories</option>
                        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                </div>
                <div class="min-w-[130px]">
                    <select
                        v-model="status"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        @change="applyFilters"
                    >
                        <option value="">All Status</option>
                        <option value="low">Low Stock</option>
                        <option value="out">Out of Stock</option>
                    </select>
                </div>
                <button @click="applyFilters" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Search</button>
                <button @click="resetFilters" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors">Reset</button>
            </div>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200">
                            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</th>
                            <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                            <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                            <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Alert</th>
                            <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cost Price</th>
                            <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Selling Price</th>
                            <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock Value</th>
                            <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-if="products.data.length === 0">
                            <td colspan="11" class="text-center py-12 text-slate-400 text-sm">No products found.</td>
                        </tr>
                        <tr
                            v-for="(product, idx) in products.data"
                            :key="product.id"
                            class="hover:bg-slate-50 transition-colors"
                        >
                            <td class="px-4 py-3 text-slate-400 text-sm">{{ (products.meta?.from || 1) + idx }}</td>
                            <td class="px-4 py-3">
                                <div class="font-semibold text-slate-800 text-sm leading-tight">{{ product.name }}</div>
                                <div v-if="product.name_si" class="text-slate-400 text-xs">{{ product.name_si }}</div>
                            </td>
                            <td class="px-4 py-3 text-sm text-slate-600">{{ product.category?.name || '—' }}</td>
                            <td class="px-4 py-3 text-sm text-slate-500 font-mono">{{ product.sku || '—' }}</td>
                            <td class="px-4 py-3 text-center text-sm text-slate-600">{{ product.unit || '—' }}</td>
                            <td class="px-4 py-3 text-right font-bold text-sm" :class="product.stock_qty <= 0 ? 'text-red-600' : product.stock_qty <= product.alert_qty ? 'text-amber-600' : 'text-slate-800'">
                                {{ fmtQty(product.stock_qty, product.unit) }}
                            </td>
                            <td class="px-4 py-3 text-right text-sm text-slate-500">{{ product.alert_qty ?? '—' }}</td>
                            <td class="px-4 py-3 text-right text-sm text-slate-600">{{ fmt(product.cost_price) }}</td>
                            <td class="px-4 py-3 text-right text-sm text-slate-600">{{ fmt(product.selling_price) }}</td>
                            <td class="px-4 py-3 text-right font-semibold text-sm text-blue-700">
                                {{ fmt(product.cost_price * product.stock_qty) }}
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" :class="stockStatus(product).cls">
                                    {{ stockStatus(product).label }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div v-if="products.meta?.last_page > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-200 print:hidden">
                <p class="text-sm text-slate-500">
                    Showing {{ products.meta.from }}–{{ products.meta.to }} of {{ products.meta.total }}
                </p>
                <div class="flex gap-1">
                    <Link
                        v-for="link in products.links"
                        :key="link.label"
                        :href="link.url || '#'"
                        :class="[
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                            link.active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                            !link.url ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
                        ]"
                        v-html="link.label"
                        preserve-scroll
                    />
                </div>
            </div>
        </div>
    </AuthenticatedLayout>
</template>
