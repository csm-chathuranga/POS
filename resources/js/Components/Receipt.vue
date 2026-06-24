<script setup>
import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { Link } from '@inertiajs/vue3';

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
    sale: {
        type: Object,
        default: () => ({}),
    },
    shopName:    { type: String, default: 'LUMAC POS' },
    shopAddress: { type: String, default: '' },
    shopPhone:   { type: String, default: '' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(val) {
    return Number(val || 0).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fmtQty(val) {
    return parseFloat(Number(val || 0).toFixed(3)).toString();
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-LK', {
        year:  'numeric',
        month: '2-digit',
        day:   '2-digit',
    });
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-LK', {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

const paymentMethodLabel = {
    cash:   'මුදල් / Cash',
    card:   'කාඩ් / Card',
    qr:     'QR ගෙවීම',
    credit: 'ණය / Credit',
};

const items    = computed(() => props.sale?.items    || []);
const payments = computed(() => props.sale?.payments || []);

// ─── Print functions ──────────────────────────────────────────────────────────
const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

async function printReceipt() {
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
    <!-- ══════════════════════════════════════════
         Screen wrapper (not printed)
    ═══════════════════════════════════════════ -->
    <div class="receipt-page-wrapper">

        <!-- Action buttons (screen only, hidden when printing) -->
        <div class="no-print flex items-center gap-3 mb-4 justify-center">
            <button
                type="button"
                @click="printReceipt"
                class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors min-h-[44px] shadow"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                නැවත මුද්‍රණය / Print Again
            </button>
            <Link
                v-if="$page?.props?.auth"
                :href="route('sales.create')"
                class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors min-h-[44px] shadow"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                නව විකුණුම / New Sale
            </Link>
        </div>

        <!-- ══════════════════════════════════════════
             THE RECEIPT (printed)
        ═══════════════════════════════════════════ -->
        <div id="thermal-receipt" class="receipt-root">

            <!-- Shop header -->
            <div class="receipt-center">
                <p class="receipt-shop-name">{{ shopName }}</p>
                <p v-if="shopAddress" class="receipt-small">{{ shopAddress }}</p>
                <p v-if="shopPhone" class="receipt-small">Tel: {{ shopPhone }}</p>
            </div>

            <div class="receipt-divider"></div>

            <!-- Invoice info -->
            <table class="receipt-table">
                <tr>
                    <td class="receipt-label">Invoice</td>
                    <td class="receipt-value">: {{ sale.invoice_no || '-' }}</td>
                </tr>
                <tr>
                    <td class="receipt-label">Date</td>
                    <td class="receipt-value">: {{ formatDate(sale.created_at) }}</td>
                </tr>
                <tr>
                    <td class="receipt-label">Time</td>
                    <td class="receipt-value">: {{ formatTime(sale.created_at) }}</td>
                </tr>
                <tr v-if="sale.user?.name">
                    <td class="receipt-label">Cashier</td>
                    <td class="receipt-value">: {{ sale.user.name }}</td>
                </tr>
                <tr v-if="sale.customer?.name">
                    <td class="receipt-label">Customer</td>
                    <td class="receipt-value">: {{ sale.customer.name }}</td>
                </tr>
            </table>

            <div class="receipt-divider"></div>

            <!-- Items header -->
            <div class="receipt-items-header">
                <span class="receipt-col-name">Description</span>
                <span class="receipt-col-qty">Qty</span>
                <span class="receipt-col-price">Price</span>
                <span class="receipt-col-total">Total</span>
            </div>
            <div class="receipt-divider-dashed"></div>

            <!-- Items -->
            <div v-for="item in items" :key="item.id || item.product_id" class="receipt-item">
                <div class="receipt-item-name">{{ item.name }}</div>
                <div class="receipt-item-row">
                    <span class="receipt-col-qty">{{ fmtQty(item.qty) }}</span>
                    <span class="receipt-col-price">{{ fmt(item.unit_price) }}</span>
                    <span class="receipt-col-total">{{ fmt(item.total ?? (item.qty * item.unit_price)) }}</span>
                </div>
                <div v-if="Number(item.discount) > 0" class="receipt-discount">
                    Discount: -{{ fmt(item.discount) }}
                </div>
            </div>

            <div class="receipt-divider-dashed"></div>

            <!-- Totals -->
            <div class="receipt-totals">
                <div class="receipt-total-row">
                    <span>Subtotal</span>
                    <span>Rs. {{ fmt(sale.subtotal) }}</span>
                </div>
                <div v-if="Number(sale.discount) > 0" class="receipt-total-row">
                    <span>Discount</span>
                    <span>-Rs. {{ fmt(sale.discount) }}</span>
                </div>
                <div v-if="Number(sale.tax) > 0" class="receipt-total-row">
                    <span>Tax</span>
                    <span>Rs. {{ fmt(sale.tax) }}</span>
                </div>
            </div>

            <div class="receipt-divider"></div>

            <!-- Grand total (large) -->
            <div class="receipt-grand-total">
                <span>TOTAL</span>
                <span>Rs. {{ fmt(sale.total) }}</span>
            </div>

            <div class="receipt-divider-dashed"></div>

            <!-- Payment breakdown -->
            <div class="receipt-totals">
                <div
                    v-for="(payment, idx) in payments"
                    :key="idx"
                    class="receipt-total-row"
                >
                    <span>{{ paymentMethodLabel[payment.method] || payment.method }}</span>
                    <span>Rs. {{ fmt(payment.amount) }}</span>
                </div>
                <!-- Fallback if no payments array but have paid/balance -->
                <template v-if="!payments.length">
                    <div class="receipt-total-row">
                        <span>ගෙවූ</span>
                        <span>Rs. {{ fmt(sale.paid) }}</span>
                    </div>
                </template>

                <div v-if="Number(sale.balance) > 0" class="receipt-total-row receipt-balance">
                    <span>ශේෂය / Balance</span>
                    <span>Rs. {{ fmt(sale.balance) }}</span>
                </div>
            </div>

            <div class="receipt-divider"></div>

            <!-- Thank you footer -->
            <div class="receipt-center receipt-footer">
                <p class="receipt-thanks-si">ගෙවීම් සඳහා ස්තූතියි!</p>
                <p class="receipt-thanks-en">Thank you for your purchase!</p>
                <p class="receipt-small" style="margin-top:4px;">**** {{ shopName }} ****</p>
            </div>

        </div>
        <!-- end #thermal-receipt -->

    </div>
    <!-- end .receipt-page-wrapper -->
</template>

<style scoped>
/* ─── Screen wrapper ───────────────────────────────────────────────── */
.receipt-page-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
}

/* ─── Receipt root ─────────────────────────────────────────────────── */
.receipt-root {
    max-width: 302px;          /* 80mm at 96 dpi */
    width: 100%;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.45;
    color: #111;
    background: #fff;
    padding: 12px 10px;
    border: 1px dashed #ccc;  /* visual only on screen */
}

/* ─── Typography helpers ───────────────────────────────────────────── */
.receipt-center   { text-align: center; }
.receipt-small    { font-size: 10px; color: #444; }
.receipt-label    { color: #555; padding-right: 4px; }
.receipt-value    { font-weight: bold; }

/* ─── Shop name ────────────────────────────────────────────────────── */
.receipt-shop-name {
    font-size: 15px;
    font-weight: bold;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 2px;
}

/* ─── Dividers ─────────────────────────────────────────────────────── */
.receipt-divider {
    border-top: 1px solid #333;
    margin: 6px 0;
}
.receipt-divider-dashed {
    border-top: 1px dashed #999;
    margin: 4px 0;
}

/* ─── Info table ───────────────────────────────────────────────────── */
.receipt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}
.receipt-table td {
    padding: 1px 0;
}

/* ─── Items header row ─────────────────────────────────────────────── */
.receipt-items-header {
    display: flex;
    font-weight: bold;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* ─── Column widths ────────────────────────────────────────────────── */
.receipt-col-name  { flex: 1; }
.receipt-col-qty   { width: 30px; text-align: center; flex-shrink: 0; }
.receipt-col-price { width: 56px; text-align: right; flex-shrink: 0; }
.receipt-col-total { width: 56px; text-align: right; flex-shrink: 0; }

/* ─── Individual item ──────────────────────────────────────────────── */
.receipt-item {
    margin: 3px 0;
}
.receipt-item-name {
    font-size: 11px;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 280px;
}
.receipt-item-row {
    display: flex;
    font-size: 11px;
}
.receipt-discount {
    font-size: 10px;
    color: #666;
    padding-left: 4px;
}

/* ─── Totals block ─────────────────────────────────────────────────── */
.receipt-totals    { font-size: 11px; }
.receipt-total-row {
    display: flex;
    justify-content: space-between;
    padding: 1px 0;
}
.receipt-balance   { font-weight: bold; }

/* ─── Grand total ──────────────────────────────────────────────────── */
.receipt-grand-total {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: bold;
    padding: 4px 0;
}

/* ─── Footer ───────────────────────────────────────────────────────── */
.receipt-footer {
    margin-top: 4px;
}
.receipt-thanks-si {
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 2px;
}
.receipt-thanks-en {
    font-size: 11px;
    color: #444;
}

/* ══════════════════════════════════════════════════════════════════════
   PRINT STYLES
══════════════════════════════════════════════════════════════════════ */
@media print {
    /* Hide everything by default */
    body > * {
        display: none !important;
    }

    /* Show only the receipt wrapper (teleported or direct) */
    .receipt-page-wrapper {
        display: flex !important;
        padding: 0 !important;
        margin: 0 !important;
    }

    /* Hide action buttons */
    .no-print {
        display: none !important;
    }

    /* Remove screen border from receipt box */
    .receipt-root {
        border: none !important;
        max-width: 302px !important;
        width: 302px !important;
        padding: 4px 6px !important;
        font-size: 11px !important;
    }

    /* Page setup */
    @page {
        size: 80mm auto;
        margin: 4mm;
    }
}
</style>
