<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, usePage } from '@inertiajs/vue3';
import { inject } from 'vue';

const t = inject('t');

const props = defineProps({
    summary:         { type: Object, default: () => ({}) },
    byPaymentMethod: { type: Array,  default: () => [] },
    sales:           { type: Array,  default: () => [] },
    date:            { type: String, default: '' },
    settings:        { type: Object, default: () => ({}) },
});

function fmt(v) {
    return 'Rs. ' + Number(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtTime(d) {
    return d ? new Date(d).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '';
}
function now() {
    return new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const methodLabel = {
    cash:   'මුදල් / Cash',
    card:   'කාඩ් / Card',
    qr:     'QR',
    credit: 'ණය / Credit',
};

async function printReport() {
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
    if (isElectron) {
        const printer = localStorage.getItem('pos_printer') || usePage().props.appSettings?.printer_name || '';
        const result  = await window.electronAPI.printReceipt(printer);
        if (!result?.success) window.print();
    } else {
        window.print();
    }
}
</script>

<template>
    <Head title="Day End Report" />
    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <Link :href="route('reports.index')" class="text-slate-400 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 class="text-xl font-bold" style="color:#0F172A;">දවස් අවසාන වාර්තාව / Day End Report — {{ date }}</h1>
                </div>
                <button
                    type="button"
                    @click="printReport"
                    class="no-print inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Report
                </button>
            </div>
        </template>

        <!-- Screen view -->
        <div class="no-print grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                <p class="text-xs text-slate-500 mb-1">මුළු ඉන්වොයිස්</p>
                <p class="text-3xl font-bold text-blue-600">{{ summary.total_bills }}</p>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                <p class="text-xs text-slate-500 mb-1">මුළු ආදායම</p>
                <p class="text-2xl font-bold text-green-600">{{ fmt(summary.total_revenue) }}</p>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                <p class="text-xs text-slate-500 mb-1">මුළු වට්ටම</p>
                <p class="text-2xl font-bold text-amber-500">{{ fmt(summary.total_discount) }}</p>
            </div>
        </div>

        <div class="no-print grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Payment method breakdown -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100">
                <div class="px-4 py-3 border-b border-slate-100">
                    <h2 class="font-semibold text-slate-800">ගෙවීම් විස්තරය</h2>
                </div>
                <div class="p-4 space-y-3">
                    <div v-if="byPaymentMethod.length === 0" class="text-center text-slate-400 py-6">අද විකුණුම් නොමැත</div>
                    <div v-for="pm in byPaymentMethod" :key="pm.method" class="flex justify-between items-center py-2 border-b border-slate-50">
                        <div>
                            <p class="font-medium text-slate-800">{{ methodLabel[pm.method] || pm.method }}</p>
                            <p class="text-xs text-slate-400">{{ pm.count }} ඉන්වොයිස්</p>
                        </div>
                        <p class="font-bold text-green-600">{{ fmt(pm.total) }}</p>
                    </div>
                </div>
            </div>

            <!-- Invoice list -->
            <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100">
                <div class="px-4 py-3 border-b border-slate-100">
                    <h2 class="font-semibold text-slate-800">ඉන්වොයිස් ලැයිස්තුව ({{ sales.length }})</h2>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <th class="px-4 py-3 text-left">ඉන්වොයිස්</th>
                                <th class="px-4 py-3 text-left">කැෂියර්</th>
                                <th class="px-4 py-3 text-right">වේලාව</th>
                                <th class="px-4 py-3 text-right">එකතුව</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="sales.length === 0">
                                <td colspan="4" class="px-4 py-8 text-center text-slate-400">අද විකුණුම් නොමැත</td>
                            </tr>
                            <tr v-for="sale in sales" :key="sale.id" class="hover:bg-slate-50 border-b border-slate-50">
                                <td class="px-4 py-2.5 font-medium text-blue-600">
                                    <Link :href="route('sales.show', sale.id)">{{ sale.invoice_no }}</Link>
                                </td>
                                <td class="px-4 py-2.5 text-slate-600">{{ sale.user?.name }}</td>
                                <td class="px-4 py-2.5 text-right text-slate-400">{{ fmtTime(sale.created_at) }}</td>
                                <td class="px-4 py-2.5 text-right font-semibold text-green-600">{{ fmt(sale.total) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ══════════════════════════════════════════
             THERMAL RECEIPT (print only)
        ═══════════════════════════════════════════ -->
        <div id="day-end-receipt" class="receipt-root">
            <!-- Header -->
            <div class="receipt-center">
                <p class="receipt-shop-name">{{ settings.shop_name || 'LMUC POS' }}</p>
                <p v-if="settings.shop_address" class="receipt-small">{{ settings.shop_address }}</p>
                <p v-if="settings.shop_phone" class="receipt-small">Tel: {{ settings.shop_phone }}</p>
            </div>

            <div class="receipt-divider"></div>

            <div class="receipt-center">
                <p style="font-size:12px;font-weight:bold;letter-spacing:1px;">*** දවස් අවසාන වාර්තාව ***</p>
                <p style="font-size:12px;font-weight:bold;letter-spacing:1px;">*** DAY END REPORT ***</p>
            </div>

            <div class="receipt-divider"></div>

            <!-- Date / time -->
            <table class="receipt-table">
                <tr><td class="receipt-label">දිනය / Date</td><td class="receipt-value">: {{ date }}</td></tr>
                <tr><td class="receipt-label">ජනනය / Generated</td><td class="receipt-value">: {{ now() }}</td></tr>
            </table>

            <div class="receipt-divider"></div>

            <!-- Summary -->
            <table class="receipt-table">
                <tr><td class="receipt-label">මුළු ඉන්වොයිස්</td><td class="receipt-value text-right">: {{ summary.total_bills }}</td></tr>
            </table>

            <div class="receipt-divider-dashed"></div>

            <!-- Payment breakdown -->
            <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin:4px 0 2px;">ගෙවීම් විස්තරය / Payment Breakdown</p>
            <div v-if="byPaymentMethod.length === 0" style="font-size:11px;color:#666;text-align:center;padding:4px 0;">අද විකුණුම් නොමැත</div>
            <table v-else class="receipt-table">
                <tr v-for="pm in byPaymentMethod" :key="pm.method">
                    <td class="receipt-label">{{ methodLabel[pm.method] || pm.method }} ({{ pm.count }})</td>
                    <td class="receipt-value" style="text-align:right;">{{ fmt(pm.total) }}</td>
                </tr>
            </table>

            <div class="receipt-divider-dashed"></div>

            <!-- Totals -->
            <table class="receipt-table">
                <tr v-if="Number(summary.total_discount) > 0">
                    <td class="receipt-label">මුළු වට්ටම</td>
                    <td class="receipt-value" style="text-align:right;">- {{ fmt(summary.total_discount) }}</td>
                </tr>
                <tr v-if="Number(summary.total_balance) > 0">
                    <td class="receipt-label">ණය ශේෂය</td>
                    <td class="receipt-value" style="text-align:right;">{{ fmt(summary.total_balance) }}</td>
                </tr>
            </table>

            <div class="receipt-divider"></div>

            <!-- Grand total -->
            <div class="receipt-grand-total">
                <span>මුළු ආදායම</span>
                <span>{{ fmt(summary.total_revenue) }}</span>
            </div>

            <div class="receipt-divider"></div>

            <!-- Invoice list -->
            <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin:4px 0 2px;">ඉන්වොයිස් / Invoices</p>
            <div class="receipt-items-header" style="font-size:9px;">
                <span style="flex:1;">Invoice</span>
                <span style="width:36px;text-align:center;">Time</span>
                <span style="width:64px;text-align:right;">Total</span>
            </div>
            <div class="receipt-divider-dashed"></div>
            <div v-for="sale in sales" :key="sale.id" style="display:flex;font-size:10px;padding:1px 0;">
                <span style="flex:1;">{{ sale.invoice_no }}</span>
                <span style="width:36px;text-align:center;">{{ fmtTime(sale.created_at) }}</span>
                <span style="width:64px;text-align:right;">{{ fmt(sale.total) }}</span>
            </div>

            <div class="receipt-divider"></div>

            <div class="receipt-center receipt-footer">
                <p class="receipt-small">*** End of Day Report ***</p>
                <p class="receipt-small">{{ settings.shop_name || 'LMUC POS' }}</p>
            </div>
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
/* ─── Screen: hide receipt ─────────────────────────────── */
#day-end-receipt {
    display: none;
}

/* ─── Print: show receipt only ─────────────────────────── */
@media print {
    .no-print { display: none !important; }

    #day-end-receipt {
        display: block !important;
    }

    /* Receipt styles */
    .receipt-root {
        width: 100%;
        max-width: 100%;
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.5;
        color: #111;
        background: #fff;
        padding: 8px 6px;
        margin: 0 auto;
    }

    /* All text 800 weight */
    .receipt-root * { font-weight: 800 !important; }

    .receipt-center   { text-align: center; margin: 2px 0; }
    .receipt-small    { font-size: 12px; }
    .receipt-label    { color: #333; padding-right: 4px; font-size: 12px; }
    .receipt-value    { font-size: 12px; }

    .receipt-shop-name {
        font-size: 16px;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-bottom: 2px;
    }

    .receipt-divider {
        border-top: 1px solid #333;
        margin: 5px 0;
    }
    .receipt-divider-dashed {
        border-top: 1px dashed #666;
        margin: 3px 0;
    }

    .receipt-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
    }
    .receipt-table td { padding: 1px 0; }

    .receipt-items-header {
        display: flex;
        font-size: 12px;
        text-transform: uppercase;
    }

    .receipt-grand-total {
        display: flex;
        justify-content: space-between;
        font-size: 15px;
        padding: 3px 0;
    }

    .receipt-footer { margin-top: 4px; }

    @page {
        size: 80mm auto;
        margin: 3mm 3mm 3mm 1mm;
    }
}
</style>
