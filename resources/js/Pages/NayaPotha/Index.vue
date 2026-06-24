<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, useForm, usePage, router } from '@inertiajs/vue3';
import { ref, computed, watch, inject } from 'vue';

const t = inject('t');

const props = defineProps({
    customers:   { type: Array, default: () => [] },
    totalCredit: { type: Number, default: 0 },
    history:     { type: Boolean, default: false },
});

function switchTab(toHistory) {
    router.get(route('naya-potha.index'), toHistory ? { history: 1 } : {}, { preserveScroll: false });
}

const flash = computed(() => usePage().props.flash);
const toast = ref(null);
let toastTimer = null;
watch(() => flash.value?.success, msg => {
    if (!msg) return;
    toast.value = msg;
    settleModal.value = false;
    reportCustomer.value = null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.value = null; }, 3500);
});

function fmt(v) {
    return 'Rs. ' + Number(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('si-LK', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('si-LK', { year: 'numeric', month: 'short', day: 'numeric' })
        + ' ' + dt.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

// ── Expand/collapse per customer ──────────────────────────────────────────────
const expanded    = ref({});
const expandedTab = ref({}); // 'sales' | 'payments'
function toggleExpand(id) {
    expanded.value[id] = !expanded.value[id];
    if (!expandedTab.value[id]) expandedTab.value[id] = 'sales';
}
function setTab(id, tab) {
    expandedTab.value[id] = tab;
}

// ── Settle modal ──────────────────────────────────────────────────────────────
const settleModal    = ref(false);
const settleCustomer = ref(null);
const settleForm     = useForm({ amount: '', note: '' });

function openSettle(customer) {
    settleCustomer.value = customer;
    settleForm.amount    = '';
    settleForm.note      = '';
    settleModal.value    = true;
}
function submitSettle() {
    settleForm.post(route('customers.settle-credit', settleCustomer.value.id), {
        preserveScroll: true,
        onSuccess: () => settleForm.reset(),
    });
}

const quickAmounts = [500, 1000, 2000, 5000, 10000];

// ── Search ────────────────────────────────────────────────────────────────────
const search = ref('');
const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return props.customers;
    return props.customers.filter(c =>
        c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
    );
});

// ── Customer-wise full report modal ───────────────────────────────────────────
const reportCustomer = ref(null);
function openReport(customer) {
    reportCustomer.value = customer;
}

function totalPaid(customer) {
    return (customer.credit_payments || []).reduce((s, p) => s + Number(p.amount), 0);
}
function totalInvoiced(customer) {
    return (customer.sales || []).reduce((s, s2) => s + Number(s2.balance), 0);
}
</script>

<template>
    <Head :title="t('nav.credit_book')" />

    <AuthenticatedLayout>
        <template #header>
            <h1 class="text-xl font-bold" style="color:#0F172A;">{{ t('nav.credit_book') }}</h1>
        </template>

        <!-- Toast -->
        <Transition name="toast">
            <div v-if="toast" class="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white" style="background:#16A34A;">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                {{ toast }}
            </div>
        </Transition>

        <!-- Active / History tabs -->
        <div class="mb-5 flex gap-1 p-1 rounded-xl w-fit" style="background:#F1F5F9;">
            <button
                type="button"
                @click="switchTab(false)"
                class="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                :style="!history
                    ? 'background:white; color:#DC2626; box-shadow:0 1px 3px rgba(0,0,0,.1);'
                    : 'color:#64748B;'"
            >
                <span class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    ක්‍රියාත්මක ණය
                </span>
            </button>
            <button
                type="button"
                @click="switchTab(true)"
                class="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                :style="history
                    ? 'background:white; color:#7C3AED; box-shadow:0 1px 3px rgba(0,0,0,.1);'
                    : 'color:#64748B;'"
            >
                <span class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    පැරණි වාර්තා
                </span>
            </button>
        </div>

        <!-- Summary cards -->
        <div class="mb-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div class="bg-white rounded-xl p-4 shadow-sm" style="border:1px solid #E2E8F0;">
                <p class="text-xs text-slate-500 mb-1">{{ history ? 'ගෙවූ ගනුදෙනුකරුවන්' : t('credit.customers') }}</p>
                <p class="text-2xl font-bold" :style="history ? 'color:#7C3AED;' : 'color:#DC2626;'">{{ customers.length }}</p>
            </div>
            <div v-if="!history" class="bg-white rounded-xl p-4 shadow-sm" style="border:1px solid #E2E8F0;">
                <p class="text-xs text-slate-500 mb-1">{{ t('credit.balance_label') }}</p>
                <p class="text-2xl font-bold" style="color:#DC2626;">{{ fmt(totalCredit) }}</p>
            </div>
        </div>

        <!-- Search -->
        <div class="mb-4 relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style="color:#94A3B8;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
            <input
                v-model="search"
                type="text"
                :placeholder="t('credit.search_placeholder')"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                style="border-color:#E2E8F0;"
            />
            <button v-if="search" type="button" @click="search = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <!-- Empty state -->
        <div v-if="customers.length === 0" class="bg-white rounded-xl shadow-sm p-16 text-center" style="border:1px solid #E2E8F0;">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 mx-auto mb-3" style="color:#CBD5E1;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-slate-500 font-medium">{{ history ? 'පැරණි ණය වාර්තා නොමැත' : t('credit.empty') }}</p>
            <p class="text-slate-400 text-sm mt-1">{{ history ? 'ණය ගෙවූ ගනුදෙනුකරුවන් මෙහි දිස්වේ' : t('credit.all_paid') }}</p>
        </div>

        <!-- No search results -->
        <div v-else-if="filtered.length === 0" class="bg-white rounded-xl shadow-sm p-10 text-center" style="border:1px solid #E2E8F0;">
            <p class="text-slate-500 font-medium">{{ t('credit.not_found') }}</p>
            <p class="text-slate-400 text-sm mt-1">"{{ search }}" {{ t('lbl.no_results') }}</p>
        </div>

        <!-- Customer list -->
        <div v-else class="space-y-3">
            <div v-for="c in filtered" :key="c.id" class="bg-white rounded-xl shadow-sm overflow-hidden" style="border:1px solid #E2E8F0;">

                <!-- Customer row -->
                <div class="flex items-center gap-3 px-4 py-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style="background-color:#DC2626;">
                        {{ c.name?.charAt(0)?.toUpperCase() }}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold truncate" style="color:#0F172A;">{{ c.name }}</p>
                        <p v-if="c.phone" class="text-xs" style="color:#64748B;">{{ c.phone }}</p>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="text-lg font-bold" style="color:#DC2626;">{{ fmt(c.credit_balance) }}</p>
                        <p class="text-xs" style="color:#94A3B8;">{{ t('credit.balance_label') }}</p>
                    </div>
                    <div class="flex gap-2 flex-shrink-0 ml-2">
                        <!-- Full report -->
                        <button type="button" @click="openReport(c)" class="px-3 py-1.5 rounded-lg text-xs font-semibold" style="background:#EFF6FF; color:#2563EB; border:1px solid #BFDBFE;">
                            {{ t('btn.report') }}
                        </button>
                        <!-- Settle (active mode only) -->
                        <button v-if="!history" type="button" @click="openSettle(c)" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style="background-color:#16A34A;">
                            {{ t('credit.settle_btn') }}
                        </button>
                        <!-- Expand toggle -->
                        <button
                            v-if="c.sales?.length || c.credit_payments?.length"
                            type="button"
                            @click="toggleExpand(c.id)"
                            class="p-1.5 rounded-lg transition-colors"
                            style="color:#64748B;"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" :class="expanded[c.id] ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Expandable section with tabs -->
                <div v-if="expanded[c.id]" style="border-top:1px solid #F1F5F9;">
                    <!-- Tabs -->
                    <div class="flex" style="background:#F8FAFC; border-bottom:1px solid #E2E8F0;">
                        <button
                            type="button"
                            @click="setTab(c.id, 'sales')"
                            class="px-4 py-2 text-xs font-semibold transition-colors"
                            :style="expandedTab[c.id] === 'sales'
                                ? 'color:#2563EB; border-bottom:2px solid #2563EB; background:white;'
                                : 'color:#64748B;'"
                        >
                            {{ t('credit.invoices_tab') }} ({{ c.sales?.length || 0 }})
                        </button>
                        <button
                            type="button"
                            @click="setTab(c.id, 'payments')"
                            class="px-4 py-2 text-xs font-semibold transition-colors"
                            :style="expandedTab[c.id] === 'payments'
                                ? 'color:#16A34A; border-bottom:2px solid #16A34A; background:white;'
                                : 'color:#64748B;'"
                        >
                            {{ t('credit.payments_tab') }} ({{ c.credit_payments?.length || 0 }})
                        </button>
                    </div>

                    <!-- Credit invoices tab -->
                    <div v-if="expandedTab[c.id] === 'sales'" style="background:#FAFAFA;">
                        <div v-if="!c.sales?.length" class="px-4 py-4 text-xs text-center" style="color:#94A3B8;">{{ t('credit.no_credit_invoices') }}</div>
                        <table v-else class="w-full text-xs">
                            <thead>
                                <tr style="background:#F1F5F9;">
                                    <th class="px-4 py-2 text-left font-semibold" style="color:#64748B;">{{ t('th.invoice') }}</th>
                                    <th class="px-4 py-2 text-left font-semibold" style="color:#64748B;">{{ t('credit.date_time') }}</th>
                                    <th class="px-4 py-2 text-right font-semibold" style="color:#64748B;">{{ t('lbl.total') }}</th>
                                    <th class="px-4 py-2 text-right font-semibold" style="color:#64748B;">{{ t('th.paid') }}</th>
                                    <th class="px-4 py-2 text-right font-semibold" style="color:#DC2626;">{{ t('lbl.balance') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="sale in c.sales" :key="sale.id" style="border-top:1px solid #F1F5F9;">
                                    <td class="px-4 py-2 font-mono font-medium">
                                        <Link :href="route('sales.show', sale.id)" class="hover:underline" style="color:#2563EB;">{{ sale.invoice_no }}</Link>
                                    </td>
                                    <td class="px-4 py-2" style="color:#64748B;">{{ fmtDate(sale.created_at) }}</td>
                                    <td class="px-4 py-2 text-right" style="color:#334155;">{{ fmt(sale.total) }}</td>
                                    <td class="px-4 py-2 text-right" style="color:#16A34A;">{{ fmt(sale.paid) }}</td>
                                    <td class="px-4 py-2 text-right font-semibold" style="color:#DC2626;">{{ fmt(sale.balance) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Payment history tab -->
                    <div v-if="expandedTab[c.id] === 'payments'" style="background:#FAFAFA;">
                        <div v-if="!c.credit_payments?.length" class="px-4 py-4 text-xs text-center" style="color:#94A3B8;">{{ t('credit.no_history') }}</div>
                        <table v-else class="w-full text-xs">
                            <thead>
                                <tr style="background:#F1F5F9;">
                                    <th class="px-4 py-2 text-left font-semibold" style="color:#64748B;">#</th>
                                    <th class="px-4 py-2 text-left font-semibold" style="color:#64748B;">{{ t('credit.date_time') }}</th>
                                    <th class="px-4 py-2 text-right font-semibold" style="color:#16A34A;">{{ t('th.paid') }}</th>
                                    <th class="px-4 py-2 text-left font-semibold" style="color:#64748B;">{{ t('lbl.note') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(pmt, idx) in c.credit_payments" :key="pmt.id" style="border-top:1px solid #F1F5F9;">
                                    <td class="px-4 py-2 text-slate-400">{{ idx + 1 }}</td>
                                    <td class="px-4 py-2" style="color:#64748B;">{{ fmtDateTime(pmt.created_at) }}</td>
                                    <td class="px-4 py-2 text-right font-bold" style="color:#16A34A;">{{ fmt(pmt.amount) }}</td>
                                    <td class="px-4 py-2" style="color:#94A3B8;">{{ pmt.note || '—' }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr style="background:#F0FDF4; border-top:2px solid #BBF7D0;">
                                    <td colspan="2" class="px-4 py-2 font-semibold text-xs" style="color:#166534;">{{ t('credit.total_paid') }}</td>
                                    <td class="px-4 py-2 text-right font-bold" style="color:#16A34A;">{{ fmt(totalPaid(c)) }}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Settle Modal ─────────────────────────────────────────────────── -->
        <Teleport to="body">
            <div v-if="settleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                    <h2 class="text-lg font-bold" style="color:#0F172A;">{{ t('credit.settle_title') }}</h2>

                    <div class="rounded-xl px-4 py-3 space-y-1" style="background:#FEF2F2; border:1px solid #FECACA;">
                        <p class="text-sm font-semibold" style="color:#0F172A;">{{ settleCustomer?.name }}</p>
                        <p class="text-xs" style="color:#64748B;">
                            {{ t('credit.balance_label') }}: <span class="font-bold" style="color:#DC2626;">{{ fmt(settleCustomer?.credit_balance) }}</span>
                        </p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color:#334155;">{{ t('credit.amount_label') }} (Rs.)</label>
                        <input
                            v-model="settleForm.amount"
                            type="number"
                            min="0.01"
                            :max="settleCustomer?.credit_balance"
                            step="0.01"
                            placeholder="0.00"
                            class="w-full border-2 border-green-300 rounded-xl px-4 py-3 text-2xl font-bold text-green-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                            autofocus
                            @keydown.enter="submitSettle"
                        />
                        <p v-if="settleForm.errors.amount" class="text-red-500 text-xs mt-1">{{ settleForm.errors.amount }}</p>

                        <!-- Quick amounts -->
                        <div class="flex gap-1.5 mt-2 flex-wrap">
                            <button
                                v-for="amt in quickAmounts" :key="amt"
                                type="button"
                                @click="settleForm.amount = Math.min(amt, settleCustomer?.credit_balance)"
                                class="px-2.5 py-1 rounded-lg border text-xs font-medium"
                                style="border-color:#E2E8F0; color:#64748B;"
                            >{{ amt }}</button>
                            <button
                                type="button"
                                @click="settleForm.amount = settleCustomer?.credit_balance"
                                class="px-2.5 py-1 rounded-lg text-xs font-semibold"
                                style="background:#FEF2F2; border:1px solid #FECACA; color:#DC2626;"
                            >{{ t('btn.full') }}</button>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color:#334155;">{{ t('lbl.note') }} ({{ t('lbl.optional') }})</label>
                        <input
                            v-model="settleForm.note"
                            type="text"
                            :placeholder="t('credit.note_placeholder')"
                            class="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            style="border-color:#D1FAE5;"
                        />
                    </div>

                    <div class="flex gap-3">
                        <button
                            type="button"
                            @click="submitSettle"
                            :disabled="settleForm.processing || !settleForm.amount"
                            class="flex-1 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                            style="background-color:#16A34A;"
                        >
                            {{ settleForm.processing ? t('lbl.saving') : t('credit.confirm_settle') }}
                        </button>
                        <button type="button" @click="settleModal = false" class="flex-1 font-semibold py-3 rounded-xl" style="background:#F1F5F9; color:#64748B;">
                            {{ t('lbl.go_back') }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- ── Customer-wise Full Report Modal ───────────────────────────────── -->
        <Teleport to="body">
            <div v-if="reportCustomer" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">

                    <!-- Header -->
                    <div class="flex items-center gap-3 px-6 py-4" style="border-bottom:1px solid #E2E8F0;">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style="background-color:#2563EB;">
                            {{ reportCustomer.name?.charAt(0)?.toUpperCase() }}
                        </div>
                        <div class="flex-1">
                            <h2 class="text-lg font-bold" style="color:#0F172A;">{{ reportCustomer.name }}</h2>
                            <p v-if="reportCustomer.phone" class="text-xs" style="color:#64748B;">{{ reportCustomer.phone }}</p>
                        </div>
                        <button type="button" @click="reportCustomer = null" class="p-2 rounded-lg hover:bg-slate-100" style="color:#64748B;">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <!-- Summary -->
                    <div class="grid grid-cols-3 gap-0" style="border-bottom:1px solid #E2E8F0;">
                        <div class="px-6 py-4 text-center" style="border-right:1px solid #E2E8F0;">
                            <p class="text-xs text-slate-500 mb-1">{{ t('credit.balance_label') }}</p>
                            <p class="text-xl font-bold" style="color:#DC2626;">{{ fmt(reportCustomer.credit_balance) }}</p>
                        </div>
                        <div class="px-6 py-4 text-center" style="border-right:1px solid #E2E8F0;">
                            <p class="text-xs text-slate-500 mb-1">{{ t('credit.invoice_balance') }}</p>
                            <p class="text-xl font-bold" style="color:#7C3AED;">{{ fmt(totalInvoiced(reportCustomer)) }}</p>
                        </div>
                        <div class="px-6 py-4 text-center">
                            <p class="text-xs text-slate-500 mb-1">{{ t('credit.total_paid') }}</p>
                            <p class="text-xl font-bold" style="color:#16A34A;">{{ fmt(totalPaid(reportCustomer)) }}</p>
                        </div>
                    </div>

                    <div class="p-6 space-y-5 max-h-[60vh] overflow-y-auto">

                        <!-- Credit invoices -->
                        <div>
                            <h3 class="text-sm font-bold mb-2" style="color:#0F172A;">{{ t('credit.invoices_tab') }}</h3>
                            <div v-if="!reportCustomer.sales?.length" class="text-xs text-slate-400 py-2">{{ t('credit.no_credit_invoices') }}</div>
                            <table v-else class="w-full text-xs rounded-xl overflow-hidden" style="border:1px solid #E2E8F0;">
                                <thead>
                                    <tr style="background:#F8FAFC;">
                                        <th class="px-3 py-2 text-left" style="color:#64748B;">{{ t('th.invoice') }}</th>
                                        <th class="px-3 py-2 text-left" style="color:#64748B;">{{ t('th.date') }}</th>
                                        <th class="px-3 py-2 text-right" style="color:#64748B;">{{ t('lbl.total') }}</th>
                                        <th class="px-3 py-2 text-right" style="color:#64748B;">{{ t('th.paid') }}</th>
                                        <th class="px-3 py-2 text-right" style="color:#DC2626;">{{ t('lbl.balance') }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="sale in reportCustomer.sales" :key="sale.id" style="border-top:1px solid #F1F5F9;">
                                        <td class="px-3 py-2 font-mono font-semibold">
                                            <Link :href="route('sales.show', sale.id)" class="hover:underline" style="color:#2563EB;">{{ sale.invoice_no }}</Link>
                                        </td>
                                        <td class="px-3 py-2" style="color:#64748B;">{{ fmtDate(sale.created_at) }}</td>
                                        <td class="px-3 py-2 text-right" style="color:#334155;">{{ fmt(sale.total) }}</td>
                                        <td class="px-3 py-2 text-right" style="color:#16A34A;">{{ fmt(sale.paid) }}</td>
                                        <td class="px-3 py-2 text-right font-bold" style="color:#DC2626;">{{ fmt(sale.balance) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Payment history -->
                        <div>
                            <h3 class="text-sm font-bold mb-2" style="color:#0F172A;">{{ t('credit.payments_tab') }}</h3>
                            <div v-if="!reportCustomer.credit_payments?.length" class="text-xs text-slate-400 py-2">{{ t('credit.no_history') }}</div>
                            <table v-else class="w-full text-xs rounded-xl overflow-hidden" style="border:1px solid #E2E8F0;">
                                <thead>
                                    <tr style="background:#F8FAFC;">
                                        <th class="px-3 py-2 text-left" style="color:#64748B;">#</th>
                                        <th class="px-3 py-2 text-left" style="color:#64748B;">{{ t('credit.date_time') }}</th>
                                        <th class="px-3 py-2 text-right" style="color:#16A34A;">{{ t('th.paid') }}</th>
                                        <th class="px-3 py-2 text-left" style="color:#64748B;">{{ t('lbl.note') }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(pmt, idx) in reportCustomer.credit_payments" :key="pmt.id" style="border-top:1px solid #F1F5F9;">
                                        <td class="px-3 py-2 text-slate-400">{{ idx + 1 }}</td>
                                        <td class="px-3 py-2" style="color:#64748B;">{{ fmtDateTime(pmt.created_at) }}</td>
                                        <td class="px-3 py-2 text-right font-bold" style="color:#16A34A;">{{ fmt(pmt.amount) }}</td>
                                        <td class="px-3 py-2" style="color:#94A3B8;">{{ pmt.note || '—' }}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr style="background:#F0FDF4; border-top:2px solid #BBF7D0;">
                                        <td colspan="2" class="px-3 py-2 font-bold text-xs" style="color:#166534;">{{ t('credit.total_paid') }}</td>
                                        <td class="px-3 py-2 text-right font-bold" style="color:#16A34A;">{{ fmt(totalPaid(reportCustomer)) }}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-4 flex gap-3" style="border-top:1px solid #E2E8F0;">
                        <button
                            v-if="!history"
                            type="button"
                            @click="openSettle(reportCustomer); reportCustomer = null"
                            class="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm"
                            style="background-color:#16A34A;"
                        >{{ t('credit.settle_btn') }}</button>
                        <button type="button" @click="reportCustomer = null" class="flex-1 font-semibold py-2.5 rounded-xl text-sm" style="background:#F1F5F9; color:#64748B;">
                            {{ t('btn.close') }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </AuthenticatedLayout>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px); }
.rotate-180 { transform: rotate(180deg); }
</style>
