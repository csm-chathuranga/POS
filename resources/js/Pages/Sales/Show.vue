<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, usePage } from '@inertiajs/vue3';
import { router } from '@inertiajs/vue3';
import { ref, computed, inject, onMounted } from 'vue';

const t     = inject('t');
const tBill = inject('tBill');

const props = defineProps({
    sale:     { type: Object, required: true },
    settings: { type: Object, default: () => ({}) },
});


const shopName    = computed(() => props.settings.shop_name    || 'LUMAC POS');
const shopAddress = computed(() => props.settings.shop_address || '');
const shopPhone   = computed(() => props.settings.shop_phone   || '');
const footer      = computed(() => props.settings.receipt_footer || '');
const currency    = computed(() => props.settings.currency     || 'Rs.');
const logoUrl     = computed(() => props.settings.logo         || null);

const isSplit = computed(() => (props.sale.payments?.length ?? 0) > 1);

const paymentLabel = computed(() => {
    if (isSplit.value) return tBill('lbl.cash') + ' + ' + tBill('lbl.card');
    const map = { cash: tBill('lbl.cash'), card: tBill('lbl.card'), qr: 'QR', credit: tBill('lbl.credit') };
    return props.sale.payments?.[0]
        ? (map[props.sale.payments[0].method] || props.sale.payments[0].method)
        : '';
});

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

function fmtTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

function n(val) {
    return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(val) {
    const num = Number(val || 0);
    // Show up to 3 decimal places but strip trailing zeros (1.000→1, 1.500→1.5)
    return parseFloat(num.toFixed(3)).toString();
}

const profit = computed(() => {
    if (!props.sale.items?.length) return 0;
    return props.sale.items.reduce((sum, item) => {
        const revenue = Number(item.total || 0);
        const cost    = Number(item.cost_price || 0) * Number(item.qty || 0);
        return sum + (revenue - cost);
    }, 0);
});

const isElectron = !!window.electronAPI?.isElectron;
const printing   = ref(false);

async function printReceipt() {
    if (printing.value) return;
    printing.value = true;
    try {
        if (isElectron) {
            const printer = localStorage.getItem('pos_printer') || usePage().props.appSettings?.printer_name || '';
            console.log('[Receipt Print] printer:', printer || '(default)');
            await window.electronAPI.printReceipt(printer);
        } else {
            window.print();
        }
    } finally {
        setTimeout(() => { printing.value = false; }, 3000);
    }
}

onMounted(async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoPrint') === '1') {
        await printReceipt();
        router.visit(route('sales.create'));
    }
});
</script>

<template>
    <Head :title="`${t('lbl.invoice_no')} ${sale.invoice_no}`" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center gap-3">
                <Link :href="route('sales.index')" class="text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 class="text-xl font-bold" style="color:#0F172A;">{{ sale.invoice_no }}</h1>
                <div class="ml-auto flex gap-2">
                    <Link
                        :href="route('sales.create')"
                        class="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        style="background-color:#16A34A;"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        {{ t('btn.new_sale') }}
                    </Link>
                </div>
            </div>
        </template>

        <!-- Print button — fixed top-right -->
        <button
            type="button"
            @click="printReceipt"
            :disabled="printing"
            title="Print"
            class="no-print print-btn fixed z-50 flex items-center gap-2 text-white rounded-full shadow-lg overflow-hidden transition-all"
            :style="`top:72px; right:24px; height:44px; padding:0 16px 0 14px; background-color:${printing ? '#6B7280' : '#2563EB'}; cursor:${printing ? 'not-allowed' : 'pointer'};`"
        >
            <!-- Spinner while printing -->
            <svg v-if="printing" class="h-5 w-5 shrink-0 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            <!-- Printer icon normally -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span class="print-label text-sm font-semibold">{{ printing ? 'Printing…' : t('btn.print') }}</span>
        </button>

        <!-- Receipt centred on screen -->
        <div id="receipt-wrapper" class="flex flex-col items-center py-6 gap-4">
            <div id="receipt-card" class="bg-white rounded-xl shadow-sm p-8" style="border:1px solid #E2E8F0; width:340px;">

                <!-- Shop header -->
                <div class="text-center mb-4">
                    <img
                        v-if="logoUrl"
                        :src="logoUrl"
                        alt="Logo"
                        class="receipt-logo mx-auto mb-2 object-contain"
                        style="max-height:64px; max-width:180px;"
                    />
                    <p class="shop-title font-extrabold text-[13px]" style="color:#0F172A; letter-spacing:0.01em;">{{ shopName }}</p>
                    <p v-if="shopAddress" class="text-[12px] font-bold" style="color:#0F172A;">{{ shopAddress }}</p>
                    <p v-if="shopPhone" class="text-[12px] font-bold" style="color:#0F172A;">{{ shopPhone }}</p>
                </div>

                <div class="divider" style="border-top:1px solid #CBD5E1; margin:10px 0;"></div>

                <!-- Invoice meta -->
                <table class="meta-table" style="width:100%; border-collapse:collapse; font-size:11px; font-weight:900; color:#0F172A; margin-bottom:4px;">
                    <tr>
                        <td class="meta-label">{{ tBill('th.invoice') }}</td>
                        <td class="meta-value font-extrabold">{{ sale.invoice_no }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">{{ tBill('th.date') }}</td>
                        <td class="meta-value">{{ fmtDate(sale.created_at) }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">{{ tBill('th.time') }}</td>
                        <td class="meta-value">{{ fmtTime(sale.created_at) }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">{{ tBill('lbl.cashier') }}</td>
                        <td class="meta-value">{{ sale.user?.name }}</td>
                    </tr>
                    <tr v-if="sale.customer">
                        <td class="meta-label">{{ tBill('lbl.customer') }}</td>
                        <td class="meta-value">{{ sale.customer.name }}</td>
                    </tr>
                </table>

                <div class="items-section divider" style="border-top:1px solid #CBD5E1; margin:10px 0;"></div>

                <!-- Items -->
                <table class="items-section" style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:10px; line-height:2; color:#0F172A; font-weight:800;">
                    <thead>
                        <tr style="border-top:2px solid #0F172A; border-bottom:2px solid #0F172A;">
                            <th style="text-align:left; width:12px; padding:2px 2px 2px 0; font-weight:800;">#</th>
                            <th style="text-align:left; padding:2px 3px 2px 0; font-weight:800;">{{ tBill('th.product') }}</th>
                            <th style="text-align:right; width:48px; padding:2px 0; font-weight:800;">{{ tBill('lbl.total') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-for="(item, index) in sale.items" :key="item.id">
                            <tr style="border-bottom:1px solid #CBD5E1;">
                                <td style="padding:2px 2px 2px 0; font-weight:800; vertical-align:top;">{{ index + 1 }}</td>
                                <td style="padding:2px 3px 2px 0; font-weight:800;">
                                    <div style="word-break:break-word;">
                                        {{ item.product_name?.split(' / ')[0] ?? item.product_name }}
                                        <span v-if="item.product?.name_si"> / {{ item.product.name_si }}</span>
                                    </div>
                                    <div style="margin-top:1px;">
                                        {{ fmtQty(item.qty) }} &times; {{ n(item.unit_price) }}
                                        <span v-if="Number(item.discount) > 0"> (ලද වට්ටම: &minus;{{ n(item.discount) }})</span>
                                    </div>
                                </td>
                                <td style="text-align:right; padding:2px 0; font-weight:800; vertical-align:bottom;">{{ n(item.total) }}</td>
                            </tr>
                        </template>
                    </tbody>
                </table>

                <div class="items-section divider" style="border-top:1px solid #CBD5E1; margin:10px 0;"></div>

                <!-- Totals -->
                <table style="width:100%; border-collapse:collapse; font-size:13px; font-weight:700; color:#0F172A;">
                    <tr>
                        <td class="meta-label">{{ tBill('lbl.subtotal') }}</td>
                        <td class="meta-value">{{ n(sale.subtotal) }}</td>
                    </tr>
                    <tr v-if="Number(sale.discount) > 0" style="color:#0F172A; font-size:13px; font-weight:800;">
                        <td class="meta-label" style="padding:6px 8px; border:2px solid #0F172A; border-right:none;">ලද වට්ටම</td>
                        <td class="meta-value" style="padding:6px 8px; border:2px solid #0F172A; border-left:none;">- {{ n(sale.discount) }}</td>
                    </tr>
                    <tr class="total-row" style="border-top:2px solid #0F172A; font-size:14px; font-weight:900; color:#0F172A;">
                        <td class="meta-label" style="padding-top:6px;">{{ tBill('lbl.total') }}</td>
                        <td class="meta-value" style="padding-top:6px;">{{ currency }} {{ n(sale.total) }}</td>
                    </tr>
                    <!-- Split: show cash and card separately -->
                    <template v-if="isSplit">
                        <tr style="color:#0F172A; font-weight:800;">
                            <td class="meta-label">{{ tBill('th.paid') }} ({{ tBill('lbl.cash') }})</td>
                            <td class="meta-value">{{ n(sale.payments[0]?.amount) }}</td>
                        </tr>
                        <tr style="color:#0F172A; font-weight:800;">
                            <td class="meta-label">{{ tBill('th.paid') }} ({{ tBill('lbl.card') }})</td>
                            <td class="meta-value">{{ n(sale.payments[1]?.amount) }}</td>
                        </tr>
                    </template>
                    <!-- Single payment -->
                    <tr v-else style="color:#0F172A; font-weight:800;">
                        <td class="meta-label">{{ tBill('th.paid') }} ({{ paymentLabel }})</td>
                        <td class="meta-value">{{ n(sale.payments?.[0]?.amount) }}</td>
                    </tr>
                    <tr v-if="Number(sale.balance) < 0">
                        <td class="meta-label">{{ tBill('lbl.change') }}</td>
                        <td class="meta-value">{{ n(Math.abs(sale.balance)) }}</td>
                    </tr>
                </table>

                <div class="divider" style="border-top:1px solid #CBD5E1; margin:10px 0;"></div>

                <!-- Footer -->
                <p class="text-center font-extrabold text-[11px]" style="color:#0F172A; white-space: pre-line;">{{ footer }}</p>

                <p class="text-center font-extrabold text-[9px] mt-2" style="color:#0F172A;">lunac.lk</p>
            </div>

        </div>
    </AuthenticatedLayout>
</template>

<style>
/* Print button pulse + label slide-in */
.print-btn {
    transition: box-shadow 0.2s, transform 0.2s;
    animation: print-pulse 2.5s ease-in-out infinite;
}
.print-btn:hover {
    transform: scale(1.06);
    box-shadow: 0 6px 20px rgba(37,99,235,0.45);
    animation: none;
}
.print-btn:active {
    transform: scale(0.96);
}
.print-label {
    display: inline-block;
    animation: label-slide 2.5s ease-in-out infinite;
}
@keyframes print-pulse {
    0%, 100% { box-shadow: 0 4px 14px rgba(37,99,235,0.35); }
    50%       { box-shadow: 0 4px 22px rgba(37,99,235,0.65); }
}
@keyframes label-slide {
    0%, 80%, 100% { opacity: 1; transform: translateX(0); }
    90%            { opacity: 0.6; transform: translateX(3px); }
}

/* Prevent browser/Tailwind from overriding font-size on table cells */
#receipt-card th,
#receipt-card td {
    font-size: inherit;
    line-height: 1.8;
}

/* Meta table: label left, value right */
.meta-label {
    text-align: left;
    padding: 2px 8px 2px 0;
    white-space: nowrap;
    width: 1%;
}
.meta-value {
    text-align: right;
    padding: 2px 0;
    word-break: break-word;
}

@media print {
    @page {
        size: 70mm auto;
        margin: 0;
    }

    html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 70mm !important;
        background: #fff !important;
    }

    /* Hide layout chrome */
    header, aside, nav, .no-print {
        display: none !important;
    }

    /* Zero every ancestor in the chain:
       body > #app > .min-h-screen > .flex-1.flex-col > main */
    body > div,
    #app > div,
    #app > div > div,
    main {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        width: 70mm !important;
    }

    #receipt-wrapper {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
    }

    #receipt-card {
        display: block !important;
        width: 70mm !important;
        max-width: 70mm !important;
        padding: 3mm 4mm !important;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        background: #fff !important;
        color: #000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    #receipt-card * {
        font-weight: 800 !important;
    }

    #receipt-card .shop-title {
        font-size: 13px !important;
        font-weight: 800 !important;
    }

    #receipt-card .total-row,
    #receipt-card .total-row span {
        font-size: 13px !important;
        font-weight: 800 !important;
    }

    #receipt-card .divider {
        border-top: 1px solid #555 !important;
        margin: 5px 0 !important;
    }

    #receipt-card .receipt-logo {
        max-height: 56px !important;
        max-width: 160px !important;
    }
}
</style>
