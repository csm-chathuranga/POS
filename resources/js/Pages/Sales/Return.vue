<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, Link, useForm, usePage } from '@inertiajs/vue3';
import { ref, computed, inject } from 'vue';

const t = inject('t');

const props = defineProps({
    sale:     { type: Object, required: true },
    settings: { type: Object, default: () => ({}) },
});

const currency = computed(() => props.settings.currency || 'Rs.');

function n(val) {
    return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(val) {
    const num = Number(val || 0);
    return parseFloat(num.toFixed(3)).toString();
}

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

// qty to return for each item (keyed by sale_item id)
const returnQtys = ref({});
props.sale.items.forEach(item => {
    returnQtys.value[item.id] = 0;
});

const returnItems = computed(() =>
    props.sale.items
        .filter(item => (returnQtys.value[item.id] ?? 0) > 0)
        .map(item => ({
            sale_item_id: item.id,
            product_id:   item.product_id ?? null,
            product_name: item.product_name,
            qty:          returnQtys.value[item.id],
            unit_price:   Number(item.unit_price),
            total:        Number(item.unit_price) * returnQtys.value[item.id],
        }))
);

const returnTotal = computed(() => returnItems.value.reduce((s, i) => s + i.total, 0));

const RETURN_REASONS = ['Defective', 'Wrong Item', 'Changed Mind', 'Damaged', 'Expired', 'Other'];

const reason = ref('');
const submitting = ref(false);
const errorMsg   = ref('');

function setQty(item, val) {
    const max = Number(item.qty);
    const n   = parseFloat(val);
    if (isNaN(n) || n < 0) { returnQtys.value[item.id] = 0; return; }
    returnQtys.value[item.id] = Math.min(n, max);
}

function selectAll(item) {
    returnQtys.value[item.id] = Number(item.qty);
}

function clearAll() {
    props.sale.items.forEach(item => { returnQtys.value[item.id] = 0; });
}

const form = useForm({});

function submitReturn() {
    if (returnItems.value.length === 0) {
        errorMsg.value = 'Select at least one item to return.';
        return;
    }
    errorMsg.value  = '';
    submitting.value = true;

    form.transform(() => ({
        items:  returnItems.value,
        reason: reason.value,
    })).post(route('sales.return.store', props.sale.id), {
        onFinish: () => { submitting.value = false; },
        onError:  (e) => { errorMsg.value = Object.values(e)[0] || 'Error processing return.'; },
    });
}
</script>

<template>
    <Head :title="`Return — ${sale.invoice_no}`" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center gap-3">
                <Link :href="route('sales.show', sale.id)" class="text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 class="text-xl font-bold text-slate-800">Sales Return — {{ sale.invoice_no }}</h1>
                <span class="ml-2 text-sm text-slate-500">{{ fmtDate(sale.created_at) }}</span>
            </div>
        </template>

        <div class="max-w-3xl mx-auto py-6 px-4 space-y-6">

            <!-- Original sale info -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-sm text-slate-500">Original Invoice</p>
                        <p class="text-lg font-bold text-slate-800">{{ sale.invoice_no }}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-slate-500">Original Total</p>
                        <p class="text-lg font-bold text-slate-800">{{ currency }} {{ n(sale.total) }}</p>
                    </div>
                </div>

                <!-- Items table -->
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-slate-200 text-slate-500 text-xs uppercase">
                                <th class="text-left py-2 pr-3">Product</th>
                                <th class="text-right py-2 px-3 w-24">Sold Qty</th>
                                <th class="text-right py-2 px-3 w-28">Unit Price</th>
                                <th class="text-center py-2 px-3 w-32">Return Qty</th>
                                <th class="text-right py-2 pl-3 w-28">Return Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in sale.items" :key="item.id" class="border-b border-slate-100 last:border-0">
                                <td class="py-3 pr-3 font-medium text-slate-800">
                                    {{ item.product_name }}
                                </td>
                                <td class="text-right py-3 px-3 text-slate-600">{{ fmtQty(item.qty) }}</td>
                                <td class="text-right py-3 px-3 text-slate-600">{{ n(item.unit_price) }}</td>
                                <td class="py-3 px-3">
                                    <div class="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            :value="returnQtys[item.id]"
                                            @input="setQty(item, $event.target.value)"
                                            min="0"
                                            :max="item.qty"
                                            step="0.001"
                                            class="w-20 text-center border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                        />
                                        <button
                                            type="button"
                                            @click="selectAll(item)"
                                            class="text-xs text-blue-600 hover:underline whitespace-nowrap"
                                            title="Return all"
                                        >All</button>
                                    </div>
                                </td>
                                <td class="text-right py-3 pl-3 font-semibold text-slate-800">
                                    <span v-if="(returnQtys[item.id] ?? 0) > 0">
                                        {{ n(Number(item.unit_price) * returnQtys[item.id]) }}
                                    </span>
                                    <span v-else class="text-slate-300">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Return summary -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h2 class="text-base font-bold text-slate-700">Return Summary</h2>

                <!-- Return total -->
                <div class="flex items-center justify-between py-3 border-t border-slate-200">
                    <span class="font-semibold text-slate-600">Return Total</span>
                    <span class="text-lg font-bold" :class="returnTotal > 0 ? 'text-red-600' : 'text-slate-400'">
                        {{ currency }} {{ n(returnTotal) }}
                    </span>
                </div>

                <!-- Reason -->
                <div>
                    <label class="block text-sm font-medium text-slate-600 mb-2">Reason (optional)</label>
                    <div class="flex flex-wrap gap-2 mb-2">
                        <button
                            v-for="r in RETURN_REASONS"
                            :key="r"
                            type="button"
                            @click="reason = (reason === r ? '' : r)"
                            class="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
                            :class="reason === r
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'"
                        >{{ r }}</button>
                    </div>
                    <input
                        v-model="reason"
                        type="text"
                        placeholder="Or type a custom reason…"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                </div>

                <!-- Error -->
                <p v-if="errorMsg" class="text-sm text-red-600 font-medium">{{ errorMsg }}</p>

                <!-- Actions -->
                <div class="flex gap-3 pt-1">
                    <button
                        type="button"
                        @click="clearAll"
                        class="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        @click="submitReturn"
                        :disabled="submitting || returnItems.length === 0"
                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
                        :class="returnItems.length === 0 || submitting
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'"
                    >
                        <svg v-if="submitting" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        {{ submitting ? 'Processing…' : 'Process Return' }}
                    </button>
                </div>
            </div>

        </div>
    </AuthenticatedLayout>
</template>
