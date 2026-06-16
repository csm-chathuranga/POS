<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link } from '@inertiajs/vue3';
import { inject } from 'vue';

const t = inject('t');

const props = defineProps({
    todaySales: { type: Number, default: 0 },
    monthSales: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    lowStockCount: { type: Number, default: 0 },
    recentSales: { type: Array, default: () => [] },
});

function formatCurrency(value) {
    return 'Rs. ' + Number(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('si-LK');
}

const statCards = [
    {
        labelKey: 'dash.today_sales',
        valueKey: 'todaySales',
        isCurrency: true,
        bg: 'bg-green-500',
        lightBg: 'bg-green-50',
        textColor: 'text-green-700',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    },
    {
        labelKey: 'dash.month_sales',
        valueKey: 'monthSales',
        isCurrency: true,
        bg: 'bg-blue-500',
        lightBg: 'bg-blue-50',
        textColor: 'text-blue-700',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    },
    {
        labelKey: 'dash.total_products',
        valueKey: 'totalProducts',
        isCurrency: false,
        bg: 'bg-purple-500',
        lightBg: 'bg-purple-50',
        textColor: 'text-purple-700',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`,
    },
    {
        labelKey: 'dash.low_stock',
        valueKey: 'lowStockCount',
        isCurrency: false,
        bg: 'bg-red-500',
        lightBg: 'bg-red-50',
        textColor: 'text-red-700',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`,
    },
];
</script>

<template>
    <Head :title="t('page.dashboard')" />

    <AuthenticatedLayout>
        <template #header>
            <h1 class="text-xl font-bold text-gray-800">{{ t('page.dashboard') }}</h1>
        </template>

        <!-- Stat Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div
                v-for="card in statCards"
                :key="card.valueKey"
                class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
                <div class="p-4">
                    <div class="flex items-center justify-between mb-3">
                        <div :class="[card.bg, 'w-12 h-12 rounded-lg flex items-center justify-center']">
                            <span v-html="card.icon"></span>
                        </div>
                    </div>
                    <div>
                        <p class="stat-card-value font-bold text-gray-900">
                            <template v-if="card.isCurrency">
                                {{ formatCurrency(props[card.valueKey]) }}
                            </template>
                            <template v-else>
                                {{ props[card.valueKey] }}
                            </template>
                        </p>
                        <p class="stat-card-label font-semibold text-gray-700 mt-1">{{ t(card.labelKey) }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Link
                :href="route('sales.create')"
                class="flex flex-col items-center justify-center text-white rounded-xl p-4 transition-colors min-h-[80px]"
                style="background-color:#2563EB;"
                @mouseover="e => e.currentTarget.style.backgroundColor='#1d4ed8'"
                @mouseleave="e => e.currentTarget.style.backgroundColor='#2563EB'"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span class="text-sm font-medium">{{ t('btn.new_sale') }}</span>
            </Link>
            <Link
                :href="route('products.create')"
                class="flex flex-col items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-4 transition-colors min-h-[80px]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span class="text-sm font-medium">{{ t('btn.new_product') }}</span>
            </Link>
            <Link
                :href="route('purchases.create')"
                class="flex flex-col items-center justify-center text-white rounded-xl p-4 transition-colors min-h-[80px]"
                style="background-color:#16A34A;"
                @mouseover="e => e.currentTarget.style.backgroundColor='#15803d'"
                @mouseleave="e => e.currentTarget.style.backgroundColor='#16A34A'"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span class="text-sm font-medium">{{ t('btn.new_purchase') }}</span>
            </Link>
            <Link
                :href="route('reports.index')"
                class="flex flex-col items-center justify-center text-white rounded-xl p-4 transition-colors min-h-[80px]"
                style="background-color:#F59E0B;"
                @mouseover="e => e.currentTarget.style.backgroundColor='#d97706'"
                @mouseleave="e => e.currentTarget.style.backgroundColor='#F59E0B'"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="text-sm font-medium">{{ t('btn.report') }}</span>
            </Link>
        </div>

        <!-- Recent Sales Table -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 class="font-semibold text-gray-800">{{ t('dash.recent_sales') }}</h2>
                <Link :href="route('sales.index')" class="text-sm hover:underline" style="color:#2563EB;">{{ t('dash.view_all') }}</Link>
            </div>

            <!-- Mobile card view -->
            <div class="md:hidden divide-y divide-gray-100">
                <div v-if="recentSales.length === 0" class="p-6 text-center text-gray-400">
                    <p>{{ t('dash.no_sales') }}</p>
                </div>
                <div
                    v-for="sale in recentSales"
                    :key="sale.id"
                    class="p-4"
                >
                    <div class="flex justify-between items-start">
                        <div>
                            <Link :href="route('sales.show', sale.id)" class="font-medium hover:underline" style="color:#2563EB;">{{ sale.invoice_no }}</Link>
                            <p class="text-sm text-gray-500">{{ sale.user?.name }}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-green-600">{{ formatCurrency(sale.total) }}</p>
                            <p class="text-xs text-gray-400">{{ formatTime(sale.created_at) }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Desktop table view -->
            <div class="hidden md:block overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                            <th class="px-4 py-3">{{ t('th.invoice') }}</th>
                            <th class="px-4 py-3">{{ t('th.cashier') }}</th>
                            <th class="px-4 py-3">{{ t('th.total') }}</th>
                            <th class="px-4 py-3">{{ t('th.time') }}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr v-if="recentSales.length === 0">
                            <td colspan="4" class="px-4 py-8 text-center text-gray-400">{{ t('dash.no_sales') }}</td>
                        </tr>
                        <tr
                            v-for="sale in recentSales"
                            :key="sale.id"
                            class="hover:bg-gray-50 transition-colors"
                        >
                            <td class="px-4 py-3">
                                <Link :href="route('sales.show', sale.id)" class="font-medium hover:underline" style="color:#2563EB;">{{ sale.invoice_no }}</Link>
                            </td>
                            <td class="px-4 py-3 text-gray-600">{{ sale.user?.name }}</td>
                            <td class="px-4 py-3 font-semibold text-green-600">{{ formatCurrency(sale.total) }}</td>
                            <td class="px-4 py-3 text-gray-400 text-sm">{{ formatTime(sale.created_at) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </AuthenticatedLayout>
</template>
