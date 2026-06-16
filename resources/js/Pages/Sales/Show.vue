<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link } from '@inertiajs/vue3';
import { router } from '@inertiajs/vue3';
import { computed, inject, onMounted } from 'vue';

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
const logoUrl     = computed(() => props.settings.logo_url     || null);

const paymentLabel = computed(() => {
    const map = { cash: tBill('lbl.cash'), card: tBill('lbl.card'), qr: 'QR', credit: tBill('lbl.credit') };
    return props.sale.payments?.[0]
        ? (map[props.sale.payments[0].method] || props.sale.payments[0].method)
        : '';
});

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('si-LK', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

function n(val) {
    return Number(val || 0).toFixed(2);
}

const profit = computed(() => {
    if (!props.sale.items?.length) return 0;
    return props.sale.items.reduce((sum, item) => {
        const revenue = Number(item.total || 0);
        const cost    = Number(item.cost_price || 0) * Number(item.qty || 0);
        return sum + (revenue - cost);
    }, 0);
});

async function printReceipt() {
    if (window.electronAPI?.isElectron) {
        const printer = localStorage.getItem('pos_printer') || '';
        const result  = await window.electronAPI.printReceipt(printer);
        if (!result?.success) {
            console.error('[print-receipt] failed:', result?.error);
            window.print();
        }
    } else {
        window.print();
    }
}

const isElectron = !!window.electronAPI?.isElectron;

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
            title="Print"
            class="no-print print-btn fixed z-50 flex items-center gap-2 text-white rounded-full shadow-lg overflow-hidden"
            style="top:72px; right:24px; height:44px; padding:0 16px 0 14px; background-color:#2563EB;"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span class="print-label text-sm font-semibold">{{ t('btn.print') }}</span>
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
                    <p class="shop-title font-extrabold text-[16px]" style="color:#0F172A; letter-spacing:0.01em;">{{ shopName }}</p>
                    <p v-if="shopAddress" class="text-[12px] font-bold" style="color:#334155;">{{ shopAddress }}</p>
                    <p v-if="shopPhone" class="text-[12px] font-bold" style="color:#334155;">{{ shopPhone }}</p>
                </div>

                <div class="divider" style="border-top:1px dashed #CBD5E1; margin:10px 0;"></div>

                <!-- Invoice meta -->
                <div class="text-[12px] space-y-1 mb-1 font-bold" style="color:#1E293B;">
                    <div class="flex justify-between">
                        <span>{{ tBill('th.invoice') }}</span>
                        <span class="font-extrabold">{{ sale.invoice_no }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>{{ tBill('th.date') }}</span>
                        <span>{{ fmtDate(sale.created_at) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>{{ tBill('th.time') }}</span>
                        <span>{{ fmtTime(sale.created_at) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>{{ tBill('lbl.cashier') }}</span>
                        <span>{{ sale.user?.name }}</span>
                    </div>
                    <div v-if="sale.customer" class="flex justify-between">
                        <span>{{ tBill('lbl.customer') }}</span>
                        <span>{{ sale.customer.name }}</span>
                    </div>
                </div>

                <div class="items-section divider" style="border-top:1px dashed #CBD5E1; margin:10px 0;"></div>

                <!-- Items -->
                <table class="items-section" style="width:100%; border-collapse:collapse; font-size:12px; color:#0F172A; font-weight:700;">
                    <thead>
                        <tr style="border-bottom:2px solid #CBD5E1;">
                            <th style="text-align:left; width:16px; padding:4px 4px 4px 0; font-weight:800;">#</th>
                            <th style="text-align:left; padding:4px 8px 4px 0; font-weight:800;">{{ tBill('th.product') }}</th>
                            <th style="text-align:center; width:28px; padding:4px 0; font-weight:800;">{{ tBill('th.qty') }}</th>
                            <th style="text-align:right; width:52px; padding:4px 0; font-weight:800;">{{ tBill('th.price') }}</th>
                            <th style="text-align:right; width:48px; padding:4px 0; font-weight:800; color:#D97706;">{{ tBill('lbl.discount') }}</th>
                            <th style="text-align:right; width:56px; padding:4px 0; font-weight:800;">{{ tBill('lbl.total') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-for="(item, index) in sale.items" :key="item.id">
                            <!-- Line 1: item number + product names -->
                            <tr>
                                <td style="padding:4px 4px 0 0; font-weight:700; vertical-align:top;">{{ index + 1 }}</td>
                                <td colspan="5" style="padding:4px 8px 0 0; word-break:break-word; font-weight:800; color:#0F172A;">
                                    <span>{{ item.product_name?.split(' / ')[0] ?? item.product_name }}</span>
                                    <span v-if="item.product?.name_si" style="font-size:11px; font-weight:700; color:#334155;"> / {{ item.product.name_si }}</span>
                                </td>
                            </tr>
                            <!-- Line 2: qty / price / discount / total -->
                            <tr style="border-bottom:1px dashed #CBD5E1;">
                                <td style="padding:0 0 5px 0;"></td>
                                <td style="padding:0 0 5px 0;"></td>
                                <td style="text-align:center; padding:0 0 5px 0; font-weight:700;">{{ item.qty }}</td>
                                <td style="text-align:right; padding:0 0 5px 0; font-weight:700;">{{ n(item.unit_price) }}</td>
                                <td style="text-align:right; padding:0 0 5px 0; color:#D97706; font-weight:700;">{{ Number(item.discount) > 0 ? n(item.discount) : '-' }}</td>
                                <td style="text-align:right; padding:0 0 5px 0; font-weight:800; color:#0F172A;">{{ n(item.total) }}</td>
                            </tr>
                        </template>
                    </tbody>
                </table>

                <div class="items-section divider" style="border-top:1px dashed #CBD5E1; margin:10px 0;"></div>

                <!-- Totals -->
                <div class="space-y-1.5 text-[12px] font-bold" style="color:#0F172A;">
                    <div class="flex justify-between">
                        <span>{{ tBill('lbl.subtotal') }}</span>
                        <span>{{ n(sale.subtotal) }}</span>
                    </div>
                    <div v-if="Number(sale.discount) > 0" class="flex justify-between" style="color:#D97706;">
                        <span>{{ tBill('lbl.discount') }}</span>
                        <span>-{{ n(sale.discount) }}</span>
                    </div>
                    <div class="total-row flex justify-between text-[15px] pt-2" style="color:#0F172A; border-top:2px solid #0F172A; font-weight:800;">
                        <span>{{ tBill('lbl.total') }}</span>
                        <span style="color:#2563EB;">{{ currency }} {{ n(sale.total) }}</span>
                    </div>
                    <div class="flex justify-between" style="color:#16A34A;">
                        <span>{{ tBill('th.paid') }} ({{ paymentLabel }})</span>
                        <span>{{ n(sale.payments?.[0]?.amount) }}</span>
                    </div>
                    <div v-if="Number(sale.balance) < 0" class="flex justify-between">
                        <span>{{ tBill('lbl.change') }}</span>
                        <span>{{ n(Math.abs(sale.balance)) }}</span>
                    </div>
                </div>

                <div class="divider" style="border-top:1px dashed #CBD5E1; margin:10px 0;"></div>

                <!-- Footer -->
                <p class="text-center font-extrabold text-[13px]" style="color:#0F172A; white-space: pre-line;">{{ footer }}</p>

                <p class="text-center font-extrabold text-[11px] mt-3" style="color:#0F172A;">lunac.lk</p>
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

@media print {
    @page {
        size: 80mm auto;
        margin: 0;
    }

    .no-print {
        display: none !important;
    }


    /* Remove screen-only card chrome, add explicit print padding */
    #receipt-card {
        width: 100% !important;
        padding: 4mm 5mm !important;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
    }

    /* Center wrapper — switch to block so card takes full width */
    #receipt-wrapper {
        display: block !important;
        padding: 0 !important;
    }

    #receipt-card {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    #receipt-card * {
        font-weight: 700 !important;
    }

    #receipt-card .shop-title {
        font-size: 16px !important;
        font-weight: 800 !important;
    }

    #receipt-card .total-row,
    #receipt-card .total-row span {
        font-size: 15px !important;
        font-weight: 800 !important;
    }

    #receipt-card .divider {
        border-top: 1px dashed #555 !important;
        margin: 5px 0 !important;
    }

    #receipt-card .receipt-logo {
        max-height: 56px !important;
        max-width: 160px !important;
    }

}
</style>
