<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, router } from '@inertiajs/vue3';
import { ref, inject } from 'vue';

const t = inject('t');

const props = defineProps({
    byDay:     { type: Array,  default: () => [] },
    byPayment: { type: Array,  default: () => [] },
    summary:   { type: Object, default: () => ({}) },
    date_from: { type: String, default: '' },
    date_to:   { type: String, default: '' },
});

const from = ref(props.date_from);
const to   = ref(props.date_to);

function fmt(v) {
    return 'Rs. ' + Number(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-LK', { weekday: 'short', month: 'short', day: 'numeric' });
}

const methodLabel = { cash: 'Cash', card: 'Card', credit: 'Credit', qr: 'QR' };

function filter() {
    router.get(route('reports.revenue'), { date_from: from.value, date_to: to.value }, { preserveScroll: true });
}
</script>

<template>
    <Head title="Revenue Report" />
    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center gap-3 flex-wrap">
                <Link :href="route('reports.index')" class="text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                </Link>
                <h1 class="text-xl font-bold" style="color:#0F172A;">Revenue Report</h1>
                <div class="ml-auto flex items-center gap-2">
                    <input type="date" v-model="from" class="rounded-lg px-3 py-1.5 text-sm outline-none" style="border:1px solid #E2E8F0;" />
                    <span class="text-slate-400">—</span>
                    <input type="date" v-model="to" class="rounded-lg px-3 py-1.5 text-sm outline-none" style="border:1px solid #E2E8F0;" />
                    <button @click="filter" class="px-4 py-1.5 text-sm text-white rounded-lg font-medium" style="background-color:#2563EB;">{{ t('btn.view') }}</button>
                </div>
            </div>
        </template>

        <!-- Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div class="bg-white rounded-xl p-4 shadow-sm" style="border:1px solid #E2E8F0;">
                <p class="text-xs text-slate-500 mb-1">Bills</p>
                <p class="text-2xl font-bold" style="color:#374151;">{{ summary.total_bills }}</p>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm" style="border:1px solid #E2E8F0;">
                <p class="text-xs text-slate-500 mb-1">Gross Sales</p>
                <p class="text-2xl font-bold" style="color:#2563EB;">{{ fmt(summary.gross_revenue) }}</p>
                <p class="text-xs text-slate-400 mt-1">before discounts</p>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm" style="border:1px solid #E2E8F0;">
                <p class="text-xs text-slate-500 mb-1">Total Cost</p>
                <p class="text-2xl font-bold" style="color:#DC2626;">{{ fmt(summary.total_cost) }}</p>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm" style="border:1px solid #E2E8F0;">
                <p class="text-xs text-slate-500 mb-1">Gross Profit</p>
                <p class="text-2xl font-bold" :style="summary.gross_profit >= 0 ? 'color:#16A34A' : 'color:#DC2626'">{{ fmt(summary.gross_profit) }}</p>
                <p class="text-xs text-slate-400 mt-1">(sell − cost) × qty</p>
            </div>
        </div>

        <!-- Discount + Net Profit banner -->
        <div class="bg-white rounded-xl shadow-sm mb-4 p-4" style="border:1px solid #E2E8F0;">
            <div class="flex flex-wrap gap-6 items-center">
                <div>
                    <p class="text-xs text-slate-500">Item Discounts</p>
                    <p class="text-lg font-bold" style="color:#EA580C;">- {{ fmt(summary.item_discount) }}</p>
                </div>
                <div class="text-slate-300 text-xl">+</div>
                <div>
                    <p class="text-xs text-slate-500">Bill Discounts</p>
                    <p class="text-lg font-bold" style="color:#EA580C;">- {{ fmt(summary.bill_discount) }}</p>
                </div>
                <div class="text-slate-300 text-xl">=</div>
                <div>
                    <p class="text-xs text-slate-500">Total Discounts</p>
                    <p class="text-lg font-bold" style="color:#EA580C;">- {{ fmt(summary.total_discount) }}</p>
                </div>
                <!-- Payment method split -->
                <div class="border-l pl-6 ml-2" style="border-color:#E2E8F0;">
                    <p class="text-xs text-slate-500 mb-1">By Payment</p>
                    <div class="flex gap-4">
                        <div v-for="p in byPayment" :key="p.method" class="text-sm">
                            <span class="text-slate-400">{{ methodLabel[p.method] || p.method }}: </span>
                            <span class="font-semibold" style="color:#374151;">{{ fmt(p.total) }}</span>
                        </div>
                    </div>
                </div>
                <div class="ml-auto text-right">
                    <p class="text-xs text-slate-500">Net Profit (after discounts)</p>
                    <p class="text-2xl font-extrabold" :style="summary.net_profit >= 0 ? 'color:#15803D' : 'color:#DC2626'">{{ fmt(summary.net_profit) }}</p>
                </div>
            </div>
        </div>

        <!-- Daily Breakdown Table -->
        <div class="bg-white rounded-xl shadow-sm" style="border:1px solid #E2E8F0;">
            <div class="px-5 py-3 border-b" style="border-color:#F1F5F9; background:#F8FAFC;">
                <p class="text-xs font-bold uppercase tracking-wider" style="color:#64748B;">Daily Breakdown</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-xs text-slate-500 uppercase" style="background:#F8FAFC; border-bottom:1px solid #E2E8F0;">
                            <th class="px-4 py-3 text-left">Date</th>
                            <th class="px-4 py-3 text-center">Bills</th>
                            <th class="px-4 py-3 text-right">Gross Sales</th>
                            <th class="px-4 py-3 text-right">Discounts</th>
                            <th class="px-4 py-3 text-right">Net Revenue</th>
                            <th class="px-4 py-3 text-right">Cost</th>
                            <th class="px-4 py-3 text-right">Gross Profit</th>
                            <th class="px-4 py-3 text-right">Net Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="byDay.length === 0">
                            <td colspan="8" class="px-4 py-8 text-center text-slate-400">{{ t('lbl.no_data') }}</td>
                        </tr>
                        <tr v-for="row in byDay" :key="row.date" class="hover:bg-slate-50" style="border-bottom:1px solid #F1F5F9;">
                            <td class="px-4 py-2.5 font-medium" style="color:#0F172A;">{{ fmtDate(row.date) }}</td>
                            <td class="px-4 py-2.5 text-center text-slate-500">{{ row.total_bills }}</td>
                            <td class="px-4 py-2.5 text-right" style="color:#2563EB;">{{ fmt(row.gross_revenue) }}</td>
                            <td class="px-4 py-2.5 text-right" style="color:#EA580C;">
                                {{ row.total_discount > 0 ? '- ' + fmt(row.total_discount) : '—' }}
                            </td>
                            <td class="px-4 py-2.5 text-right" style="color:#0369A1;">{{ fmt(row.net_revenue) }}</td>
                            <td class="px-4 py-2.5 text-right" style="color:#DC2626;">{{ fmt(row.total_cost) }}</td>
                            <td class="px-4 py-2.5 text-right font-medium" :style="row.gross_profit >= 0 ? 'color:#16A34A' : 'color:#DC2626'">{{ fmt(row.gross_profit) }}</td>
                            <td class="px-4 py-2.5 text-right font-semibold" :style="row.net_profit >= 0 ? 'color:#15803D' : 'color:#DC2626'">{{ fmt(row.net_profit) }}</td>
                        </tr>
                    </tbody>
                    <tfoot v-if="byDay.length > 0">
                        <tr class="text-sm font-bold" style="background:#F8FAFC; border-top:2px solid #E2E8F0;">
                            <td class="px-4 py-3" style="color:#374151;">Total</td>
                            <td class="px-4 py-3 text-center" style="color:#374151;">{{ summary.total_bills }}</td>
                            <td class="px-4 py-3 text-right" style="color:#2563EB;">{{ fmt(summary.gross_revenue) }}</td>
                            <td class="px-4 py-3 text-right" style="color:#EA580C;">- {{ fmt(summary.total_discount) }}</td>
                            <td class="px-4 py-3 text-right" style="color:#0369A1;">{{ fmt(summary.net_revenue) }}</td>
                            <td class="px-4 py-3 text-right" style="color:#DC2626;">{{ fmt(summary.total_cost) }}</td>
                            <td class="px-4 py-3 text-right" :style="summary.gross_profit >= 0 ? 'color:#16A34A' : 'color:#DC2626'">{{ fmt(summary.gross_profit) }}</td>
                            <td class="px-4 py-3 text-right" :style="summary.net_profit >= 0 ? 'color:#15803D' : 'color:#DC2626'">{{ fmt(summary.net_profit) }}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </AuthenticatedLayout>
</template>
