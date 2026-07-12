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
const printSize  = ref(localStorage.getItem('receipt_print_size') || '80mm');

function togglePrintSize() {
    printSize.value = printSize.value === '80mm' ? 'a5' : '80mm';
    localStorage.setItem('receipt_print_size', printSize.value);
}

async function printReceipt() {
    if (printing.value) return;
    printing.value = true;

    // inject dynamic @page size before printing
    const styleId = 'dynamic-print-page-size';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = styleId; document.head.appendChild(styleEl); }
    if (printSize.value === 'a5') {
        styleEl.textContent = '@page { size: A5 portrait; margin: 10mm; }';
        document.body.classList.add('print-a5');
    } else {
        styleEl.textContent = '@page { size: 80mm auto; margin: 0; }';
        document.body.classList.remove('print-a5');
    }

    try {
        if (isElectron) {
            const printer = localStorage.getItem('pos_printer') || usePage().props.appSettings?.printer_name || '';
            await window.electronAPI.printReceipt(printer);
            await window.electronAPI.openCashDrawer?.();
        } else {
            window.print();
        }
    } finally {
        document.body.classList.remove('print-a5');
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
                <div class="ml-auto flex gap-2 flex-wrap">
                    <!-- A5 / 80mm toggle -->
                    <button
                        type="button"
                        @click="togglePrintSize"
                        class="no-print flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors"
                        :class="printSize === 'a5'
                            ? 'bg-violet-100 border-violet-400 text-violet-700'
                            : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'"
                        :title="printSize === 'a5' ? 'Switch to 80mm thermal' : 'Switch to A5 paper'"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {{ printSize === 'a5' ? 'A5' : '80mm' }}
                    </button>
                    <!-- Sales Return -->
                    <Link
                        v-if="!sale.returns_count"
                        :href="route('sales.return.create', sale.id)"
                        class="no-print flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        style="background-color:#DC2626;"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        {{ t('btn.return') }}
                    </Link>
                    <span
                        v-else
                        class="no-print flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed"
                        style="background-color:#FEE2E2; color:#DC2626;"
                        :title="t('btn.return') + ' already processed'"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Returned
                    </span>
                    <Link
                        :href="route('sales.create')"
                        class="no-print flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold"
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

            <!-- ══ 80mm THERMAL RECEIPT ══ -->
            <div v-if="printSize !== 'a5'" id="receipt-card" class="bg-white rounded-xl shadow-sm p-6" style="border:1px solid #E2E8F0; width:340px;">

                <!-- Shop header -->
                <div class="text-center mb-4">
                    <img
                        v-if="logoUrl"
                        :src="logoUrl"
                        alt="Logo"
                        class="receipt-logo mx-auto mb-2 object-contain"
                        style="max-height:64px; max-width:180px;"
                    />
                    <p class="shop-title font-extrabold" style="font-size:17px; color:#0F172A; letter-spacing:0.01em;">{{ shopName }}</p>
                    <p v-if="shopAddress" class="font-bold" style="font-size:17px; color:#0F172A;">{{ shopAddress }}</p>
                    <p v-if="shopPhone" class="font-bold" style="font-size:17px; color:#0F172A;">{{ shopPhone }}</p>
                </div>

                <div class="divider" style="border-top:1px solid #CBD5E1; margin:10px 0;"></div>

                <!-- Invoice meta -->
                <table class="meta-table" style="width:100%; border-collapse:collapse; font-size:12px; font-weight:900; color:#0F172A; margin-bottom:4px;">
                    <tr>
                        <td class="meta-label">{{ tBill('th.invoice') }}</td>
                        <td class="meta-value font-extrabold">{{ sale.invoice_no }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">{{ tBill('th.date') }}</td>
                        <td class="meta-value">{{ fmtDate(sale.created_at) }} {{ fmtTime(sale.created_at) }}</td>
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
                <table class="items-section" style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:13px; line-height:2; color:#0F172A; font-weight:800;">
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
                                        <span v-if="item.original_price" style="text-decoration:line-through; color:#94A3B8; font-size:10px; margin-left:3px;">{{ n(item.original_price) }}</span>
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
                    <template v-if="sale.extra_charges?.length">
                        <tr v-for="(ec, i) in sale.extra_charges" :key="i" style="color:#0F172A; font-size:12px; font-weight:700;">
                            <td class="meta-label">+ {{ ec.reason }}</td>
                            <td class="meta-value">{{ n(ec.amount) }}</td>
                        </tr>
                    </template>
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

            <!-- ══ A5 LETTERHEAD INVOICE ══ -->
            <div v-if="printSize === 'a5'" id="a5-receipt" class="bg-white rounded-xl overflow-hidden" style="width:595px; box-shadow:0 4px 24px rgba(0,0,0,0.12); border:1px solid #e2e8f0;">

                <!-- Letterhead header -->
                <div class="a5-header" style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%); padding:22px 28px; display:flex; align-items:center; justify-content:space-between; gap:16px;">
                    <div style="flex-shrink:0;">
                        <img
                            v-if="logoUrl"
                            :src="logoUrl"
                            alt="Logo"
                            class="a5-logo"
                            style="max-height:72px; max-width:190px; object-fit:contain; filter:brightness(0) invert(1);"
                        />
                        <div v-else style="width:64px; height:64px; border-radius:12px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="width:32px;height:32px;color:white;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                    </div>
                    <div style="text-align:right; color:white; flex:1;">
                        <p style="font-size:24px; font-weight:900; margin:0; letter-spacing:0.02em; text-shadow:0 1px 3px rgba(0,0,0,0.2);">{{ shopName }}</p>
                        <p v-if="shopAddress" style="font-size:13px; opacity:0.85; margin:4px 0 0; font-weight:500;">{{ shopAddress }}</p>
                        <p v-if="shopPhone" style="font-size:13px; opacity:0.85; margin:3px 0 0; font-weight:500;">{{ shopPhone }}</p>
                    </div>
                </div>

                <!-- Invoice title + meta row -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:20px 28px 14px; border-bottom:2px solid #e2e8f0; gap:16px;">
                    <!-- Left: INVOICE title + customer -->
                    <div>
                        <p style="font-size:26px; font-weight:900; color:#1e3a8a; letter-spacing:0.06em; margin:0 0 10px; text-transform:uppercase;">{{ tBill('th.invoice') }}</p>
                        <div v-if="sale.customer" style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:8px 12px; min-width:160px;">
                            <p style="font-size:11px; color:#0369a1; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 3px;">{{ tBill('lbl.customer') }}</p>
                            <p style="font-size:14px; font-weight:800; color:#0c4a6e; margin:0;">{{ sale.customer.name }}</p>
                            <p v-if="sale.customer.phone" style="font-size:12px; color:#0369a1; margin:2px 0 0;">{{ sale.customer.phone }}</p>
                        </div>
                    </div>
                    <!-- Right: meta table -->
                    <div style="text-align:right;">
                        <table style="border-collapse:collapse; font-size:13px; margin-left:auto;">
                            <tr>
                                <td style="padding:3px 12px 3px 0; color:#64748B; font-weight:600; white-space:nowrap;">{{ tBill('th.invoice') }} #</td>
                                <td style="padding:3px 0; font-weight:900; color:#1e3a8a; font-size:14px;">{{ sale.invoice_no }}</td>
                            </tr>
                            <tr>
                                <td style="padding:3px 12px 3px 0; color:#64748B; font-weight:600; white-space:nowrap;">{{ tBill('th.date') }}</td>
                                <td style="padding:3px 0; font-weight:600; color:#374151;">{{ fmtDate(sale.created_at) }}</td>
                            </tr>
                            <tr>
                                <td style="padding:3px 12px 3px 0; color:#64748B; font-weight:600; white-space:nowrap;">{{ tBill('th.time') }}</td>
                                <td style="padding:3px 0; font-weight:600; color:#374151;">{{ fmtTime(sale.created_at) }}</td>
                            </tr>
                            <tr>
                                <td style="padding:3px 12px 3px 0; color:#64748B; font-weight:600; white-space:nowrap;">{{ tBill('lbl.cashier') }}</td>
                                <td style="padding:3px 0; font-weight:600; color:#374151;">{{ sale.user?.name }}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Items table -->
                <div style="padding:0 28px;">
                    <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:16px; margin-bottom:16px;">
                        <thead>
                            <tr style="background:#1e3a8a;">
                                <th style="padding:10px 8px; text-align:left; color:white; font-weight:700; font-size:12px; width:28px;">#</th>
                                <th style="padding:10px 8px; text-align:left; color:white; font-weight:700; font-size:12px;">{{ tBill('th.product') }}</th>
                                <th style="padding:10px 8px; text-align:center; color:white; font-weight:700; font-size:12px; width:55px;">{{ tBill('th.qty') }}</th>
                                <th style="padding:10px 8px; text-align:right; color:white; font-weight:700; font-size:12px; width:90px;">{{ tBill('th.price') }}</th>
                                <th style="padding:10px 8px; text-align:right; color:white; font-weight:700; font-size:12px; width:95px;">{{ tBill('lbl.total') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(item, index) in sale.items"
                                :key="item.id"
                                :style="index % 2 === 0 ? 'background:#f8fafc;' : 'background:#ffffff;'"
                            >
                                <td style="padding:9px 8px; color:#94A3B8; font-size:12px; vertical-align:top; border-bottom:1px solid #f1f5f9;">{{ index + 1 }}</td>
                                <td style="padding:9px 8px; vertical-align:top; border-bottom:1px solid #f1f5f9;">
                                    <div style="font-weight:700; color:#0F172A;">{{ item.product_name?.split(' / ')[0] ?? item.product_name }}</div>
                                    <div v-if="item.product?.name_si" style="font-size:11px; color:#64748B; margin-top:1px;">{{ item.product.name_si }}</div>
                                    <div v-if="Number(item.discount) > 0" style="font-size:11px; color:#DC2626; margin-top:2px;">ලද වට්ටම: &minus;{{ n(item.discount) }}</div>
                                    <div v-if="item.original_price" style="font-size:11px; color:#94A3B8; text-decoration:line-through; margin-top:1px;">{{ n(item.original_price) }}</div>
                                </td>
                                <td style="padding:9px 8px; text-align:center; color:#374151; font-weight:600; vertical-align:top; border-bottom:1px solid #f1f5f9;">{{ fmtQty(item.qty) }}</td>
                                <td style="padding:9px 8px; text-align:right; color:#374151; font-weight:600; vertical-align:top; border-bottom:1px solid #f1f5f9;">{{ n(item.unit_price) }}</td>
                                <td style="padding:9px 8px; text-align:right; font-weight:800; color:#0F172A; vertical-align:top; border-bottom:1px solid #f1f5f9;">{{ n(item.total) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Totals section -->
                <div style="padding:0 28px 20px; display:flex; justify-content:flex-end;">
                    <div style="min-width:260px; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0;">
                        <table style="width:100%; border-collapse:collapse; font-size:13px;">
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:9px 14px; color:#64748B; font-weight:600;">{{ tBill('lbl.subtotal') }}</td>
                                <td style="padding:9px 14px; text-align:right; font-weight:700; color:#0F172A;">{{ currency }} {{ n(sale.subtotal) }}</td>
                            </tr>
                            <tr v-if="Number(sale.discount) > 0" style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:9px 14px; color:#DC2626; font-weight:600;">{{ tBill('lbl.discount') }}</td>
                                <td style="padding:9px 14px; text-align:right; font-weight:700; color:#DC2626;">&minus; {{ currency }} {{ n(sale.discount) }}</td>
                            </tr>
                            <template v-if="sale.extra_charges?.length">
                                <tr v-for="(ec, i) in sale.extra_charges" :key="i" style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:9px 14px; color:#64748B; font-weight:600;">+ {{ ec.reason }}</td>
                                    <td style="padding:9px 14px; text-align:right; font-weight:700; color:#0F172A;">{{ currency }} {{ n(ec.amount) }}</td>
                                </tr>
                            </template>
                            <!-- Grand total highlight row -->
                            <tr style="background:#1e3a8a;">
                                <td style="padding:12px 14px; color:white; font-weight:900; font-size:15px;">{{ tBill('lbl.total') }}</td>
                                <td style="padding:12px 14px; text-align:right; color:white; font-weight:900; font-size:15px;">{{ currency }} {{ n(sale.total) }}</td>
                            </tr>
                            <!-- Payments -->
                            <template v-if="isSplit">
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:8px 14px; color:#64748B; font-size:12px; font-weight:600;">{{ tBill('th.paid') }} ({{ tBill('lbl.cash') }})</td>
                                    <td style="padding:8px 14px; text-align:right; font-weight:700; color:#0F172A; font-size:12px;">{{ n(sale.payments[0]?.amount) }}</td>
                                </tr>
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:8px 14px; color:#64748B; font-size:12px; font-weight:600;">{{ tBill('th.paid') }} ({{ tBill('lbl.card') }})</td>
                                    <td style="padding:8px 14px; text-align:right; font-weight:700; color:#0F172A; font-size:12px;">{{ n(sale.payments[1]?.amount) }}</td>
                                </tr>
                            </template>
                            <tr v-else style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:8px 14px; color:#64748B; font-size:12px; font-weight:600;">{{ tBill('th.paid') }} ({{ paymentLabel }})</td>
                                <td style="padding:8px 14px; text-align:right; font-weight:700; color:#0F172A; font-size:12px;">{{ n(sale.payments?.[0]?.amount) }}</td>
                            </tr>
                            <tr v-if="Number(sale.balance) < 0">
                                <td style="padding:8px 14px; color:#64748B; font-size:12px; font-weight:600;">{{ tBill('lbl.change') }}</td>
                                <td style="padding:8px 14px; text-align:right; font-weight:700; color:#16A34A; font-size:12px;">{{ currency }} {{ n(Math.abs(sale.balance)) }}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Footer band -->
                <div style="border-top:2px solid #e2e8f0; padding:14px 28px; background:#f8fafc; text-align:center;">
                    <p v-if="footer" style="font-size:12px; color:#64748B; white-space:pre-line; margin:0 0 5px; font-weight:500;">{{ footer }}</p>
                    <p style="font-size:10px; color:#94A3B8; margin:0; font-weight:600; letter-spacing:0.05em;">lunac.lk</p>
                </div>
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
    /* Hide layout chrome */
    header, aside, nav, .no-print {
        display: none !important;
    }

    html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
    }

    body > div,
    #app > div,
    #app > div > div,
    main {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: 0 !important;
        height: auto !important;
    }

    #receipt-wrapper {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
    }

    /* ── 80mm thermal (default) ── */
    body:not(.print-a5) html,
    body:not(.print-a5) {
        width: 80mm !important;
    }

    body:not(.print-a5) > div,
    body:not(.print-a5) #app > div,
    body:not(.print-a5) #app > div > div,
    body:not(.print-a5) main {
        width: 80mm !important;
    }

    body:not(.print-a5) #receipt-card {
        display: block !important;
        width: 80mm !important;
        max-width: 80mm !important;
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

    body:not(.print-a5) #receipt-card .receipt-logo {
        max-height: 56px !important;
        max-width: 160px !important;
    }

    /* ── A5 paper: hide thermal, show A5 invoice ── */
    body.print-a5 #receipt-card { display: none !important; }

    body.print-a5 #a5-receipt {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    /* Preserve gradient in print */
    body.print-a5 .a5-header {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%) !important;
    }

    /* Invert logo filter for print */
    body.print-a5 .a5-logo {
        filter: brightness(0) invert(1) !important;
    }

    /* Common */
    #receipt-card * {
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

    /* 80mm: hide A5 invoice */
    body:not(.print-a5) #a5-receipt { display: none !important; }
}
</style>
