<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, router } from '@inertiajs/vue3';
import { ref, watch, computed, inject } from 'vue';

const t = inject('t');

const props = defineProps({
    sales: { type: Object, default: () => ({ data: [], links: [], meta: {} }) },
    filters: { type: Object, default: () => ({}) },
    grandTotal: { type: Number, default: 0 },
});

const search   = ref(props.filters?.search    || '');
const dateFrom = ref(props.filters?.date_from || '');
const dateTo   = ref(props.filters?.date_to   || '');

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function mondayStr() {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
}
function monthStartStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const activePeriod = computed(() => {
    const today = todayStr();
    if (dateFrom.value === today && dateTo.value === today) return 'today';
    if (dateFrom.value === mondayStr() && dateTo.value === today) return 'week';
    if (dateFrom.value === monthStartStr() && dateTo.value === today) return 'month';
    return null;
});

function setPeriod(period) {
    const today = todayStr();
    if (period === 'today') { dateFrom.value = today; dateTo.value = today; }
    else if (period === 'week')  { dateFrom.value = mondayStr();     dateTo.value = today; }
    else if (period === 'month') { dateFrom.value = monthStartStr(); dateTo.value = today; }
}

let searchTimer = null;
watch([search, dateFrom, dateTo], () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        router.get(route('sales.index'), {
            search:    search.value,
            date_from: dateFrom.value,
            date_to:   dateTo.value,
        }, { preserveState: true, replace: true });
    }, 400);
});

function formatCurrency(value) {
    return 'Rs. ' + Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('si-LK');
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

const statusLabel = computed(() => ({
    completed: t('btn.complete'),
    pending: t('th.status'),
    cancelled: t('btn.cancel'),
    credit: t('lbl.credit'),
}));

const statusClass = {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    credit: 'bg-blue-100 text-blue-700',
};
</script>

<template>
    <Head :title="t('page.sales')" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between">
                <h1 class="text-xl font-bold text-gray-800">{{ t('page.sales') }}</h1>
                <Link
                    :href="route('sales.create')"
                    class="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    {{ t('btn.new_sale') }}
                </Link>
            </div>
        </template>

        <!-- Filters -->
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
            <div class="flex-1 relative">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    v-model="search"
                    type="text"
                    :placeholder="t('lbl.invoice_no')"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
            </div>
            <!-- Period chips -->
            <div class="flex items-center gap-1.5">
                <button
                    v-for="p in [{key:'today',label:t('lbl.today')},{key:'week',label:t('lbl.this_week')},{key:'month',label:t('lbl.this_month')}]"
                    :key="p.key"
                    type="button"
                    @click="setPeriod(p.key)"
                    class="px-3 py-2 rounded-lg text-sm font-semibold border transition-colors min-h-[44px]"
                    :class="activePeriod === p.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'"
                >{{ p.label }}</button>
            </div>
            <input
                v-model="dateFrom"
                type="date"
                class="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
            <input
                v-model="dateTo"
                type="date"
                class="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
        </div>

        <!-- Mobile cards -->
        <div class="md:hidden space-y-3 mb-4">
            <div v-if="sales.data?.length === 0" class="bg-white rounded-xl p-6 text-center text-gray-400">
                {{ t('lbl.no_data') }}
            </div>
            <div
                v-for="sale in sales.data"
                :key="sale.id"
                class="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-semibold text-gray-900">
                            {{ sale.invoice_no }}
                            <span v-if="sale.returns_count > 0" class="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">RTN</span>
                        </p>
                        <p class="text-sm text-gray-500">{{ sale.customer?.name || t('lbl.general') }}</p>
                        <p class="text-xs text-gray-400">{{ sale.user?.name }} · {{ formatDate(sale.created_at) }}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-green-600">{{ formatCurrency(sale.total) }}</p>
                        <span
                            class="text-xs font-medium px-2 py-0.5 rounded-full"
                            :class="statusClass[sale.status] || 'bg-gray-100 text-gray-600'"
                        >
                            {{ statusLabel[sale.status] || sale.status }}
                        </span>
                    </div>
                </div>
                <Link
                    :href="route('sales.show', sale.id)"
                    class="block text-center bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] leading-[44px]"
                >
                    {{ t('btn.view') }}
                </Link>
            </div>
        </div>

        <!-- Desktop table -->
        <div class="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                            <th class="px-4 py-3">{{ t('th.invoice') }}</th>
                            <th class="px-4 py-3">{{ t('lbl.customer') }}</th>
                            <th class="px-4 py-3">{{ t('th.total') }}</th>
                            <th class="px-4 py-3">{{ t('th.status') }}</th>
                            <th class="px-4 py-3">{{ t('lbl.cashier') }}</th>
                            <th class="px-4 py-3">{{ t('th.date') }}</th>
                            <th class="px-4 py-3 text-right">{{ t('th.actions') }}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr v-if="sales.data?.length === 0">
                            <td colspan="7" class="px-4 py-8 text-center text-gray-400">{{ t('lbl.no_data') }}</td>
                        </tr>
                        <tr
                            v-for="sale in sales.data"
                            :key="sale.id"
                            class="hover:bg-gray-50 transition-colors"
                        >
                            <td class="px-4 py-3 font-medium text-blue-600">
                            {{ sale.invoice_no }}
                            <span v-if="sale.returns_count > 0" class="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">RTN</span>
                        </td>
                            <td class="px-4 py-3 text-gray-600">{{ sale.customer?.name || t('lbl.general') }}</td>
                            <td class="px-4 py-3 font-semibold text-green-600">{{ formatCurrency(sale.total) }}</td>
                            <td class="px-4 py-3">
                                <span
                                    class="text-xs font-medium px-2 py-1 rounded-full"
                                    :class="statusClass[sale.status] || 'bg-gray-100 text-gray-600'"
                                >
                                    {{ statusLabel[sale.status] || sale.status }}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-gray-600">{{ sale.user?.name }}</td>
                            <td class="px-4 py-3 text-gray-500 text-sm">
                                {{ formatDate(sale.created_at) }}
                                <span class="text-gray-400">{{ formatTime(sale.created_at) }}</span>
                            </td>
                            <td class="px-4 py-3 text-right">
                                <Link
                                    :href="route('sales.show', sale.id)"
                                    class="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 rounded hover:bg-blue-50 min-h-[36px] inline-flex items-center"
                                >
                                    {{ t('btn.view') }}
                                </Link>
                            </td>
                        </tr>
                    </tbody>
                    <!-- Total row -->
                    <tfoot v-if="sales.data?.length > 0">
                        <tr class="bg-gray-50 border-t-2 border-gray-200">
                            <td colspan="2" class="px-4 py-3 font-semibold text-gray-700">{{ t('lbl.total') }}</td>
                            <td class="px-4 py-3 font-bold text-green-700 text-lg">{{ formatCurrency(grandTotal) }}</td>
                            <td colspan="4"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <!-- Mobile total -->
        <div v-if="sales.data?.length > 0" class="md:hidden bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex justify-between items-center">
            <span class="font-semibold text-gray-700">{{ t('lbl.total') }}</span>
            <span class="font-bold text-green-600 text-lg">{{ formatCurrency(grandTotal) }}</span>
        </div>

        <!-- Pagination -->
        <div v-if="sales.links?.length > 3" class="flex flex-wrap justify-center gap-1">
            <template v-for="link in sales.links" :key="link.label">
                <Link
                    v-if="link.url"
                    :href="link.url"
                    class="px-3 py-2 text-sm rounded-lg border transition-colors min-h-[44px] flex items-center"
                    :class="link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
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
</template>
