<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import ConfirmModal from '@/Components/ConfirmModal.vue';
import { Head, Link, router } from '@inertiajs/vue3';
import { inject, ref } from 'vue';

const t = inject('t');

const props = defineProps({
    purchase: { type: Object, required: true },
});

const showDeleteModal = ref(false);
const deleting = ref(false);

function fmt(val) {
    return 'Rs. ' + Number(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function printGrn() {
    window.print();
}

function confirmDelete() {
    deleting.value = true;
    router.delete(route('purchases.destroy', props.purchase.id), {
        onFinish: () => { deleting.value = false; showDeleteModal.value = false; },
    });
}
</script>

<template>
    <Head :title="`GRN - ${purchase.grn_no}`" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <Link
                        :href="route('purchases.index')"
                        class="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <span class="text-gray-300">|</span>
                    <h1 class="text-xl font-bold text-gray-800">GRN — {{ purchase.grn_no }}</h1>
                </div>
                <div class="flex items-center gap-2">
                    <button
                        @click="showDeleteModal = true"
                        class="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                    <button
                        @click="printGrn"
                        class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print GRN
                    </button>
                </div>
            </div>
        </template>

        <div class="max-w-4xl mx-auto space-y-4 print:max-w-full print:mx-0">

            <!-- GRN Header -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border print:rounded-none">
                <div class="flex items-start justify-between mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800">Goods Receipt Note</h2>
                        <p class="text-sm text-gray-500 mt-1">{{ purchase.grn_no }}</p>
                    </div>
                    <span
                        class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        :class="purchase.status === 'received'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'"
                    >
                        {{ purchase.status }}
                    </span>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                        <p class="font-semibold text-gray-800">{{ fmtDate(purchase.purchase_date) }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Supplier</p>
                        <p class="font-semibold text-gray-800">{{ purchase.supplier?.name || '—' }}</p>
                        <p v-if="purchase.supplier?.company" class="text-xs text-gray-500">{{ purchase.supplier.company }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Received By</p>
                        <p class="font-semibold text-gray-800">{{ purchase.user?.name || '—' }}</p>
                    </div>
                    <div>
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Created</p>
                        <p class="font-semibold text-gray-800">{{ fmtDate(purchase.created_at) }}</p>
                    </div>
                </div>

                <div v-if="purchase.note" class="mt-4 pt-4 border-t border-gray-100">
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Note</p>
                    <p class="text-sm text-gray-700">{{ purchase.note }}</p>
                </div>
            </div>

            <!-- Items Table -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border print:rounded-none">
                <div class="p-6 pb-0">
                    <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Items</h3>
                </div>

                <!-- Desktop -->
                <div class="hidden sm:block overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-100">
                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                <th class="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                                <th class="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost (Rs.)</th>
                                <th class="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(item, i) in purchase.items"
                                :key="item.id"
                                class="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                            >
                                <td class="px-6 py-3 text-gray-400 font-mono text-xs">{{ i + 1 }}</td>
                                <td class="px-6 py-3">
                                    <div class="font-medium text-gray-800">{{ item.product_name }}</div>
                                    <div v-if="item.product?.name_si" class="text-xs text-blue-600">{{ item.product.name_si }}</div>
                                    <div v-if="item.product?.barcode" class="text-xs text-gray-400 font-mono">{{ item.product.barcode }}</div>
                                </td>
                                <td class="px-6 py-3 text-right font-semibold text-gray-700">{{ Number(item.qty) }}</td>
                                <td class="px-6 py-3 text-right text-gray-600">{{ fmt(item.cost_price) }}</td>
                                <td class="px-6 py-3 text-right font-bold text-gray-800">{{ fmt(item.total) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Mobile -->
                <div class="sm:hidden p-4 space-y-3">
                    <div
                        v-for="(item, i) in purchase.items"
                        :key="item.id"
                        class="border border-gray-100 rounded-lg p-3"
                    >
                        <div class="flex justify-between items-start mb-1">
                            <div>
                                <p class="font-semibold text-gray-800 text-sm">{{ item.product_name }}</p>
                                <p v-if="item.product?.name_si" class="text-xs text-blue-600">{{ item.product.name_si }}</p>
                            </div>
                            <span class="text-xs text-gray-400">#{{ i + 1 }}</span>
                        </div>
                        <div class="flex justify-between text-xs text-gray-500 mt-2">
                            <span>{{ Number(item.qty) }} × {{ fmt(item.cost_price) }}</span>
                            <span class="font-bold text-gray-800">{{ fmt(item.total) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Totals -->
                <div class="px-6 py-4 border-t border-gray-100 space-y-2">
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>Items</span>
                        <span>{{ purchase.items?.length || 0 }}</span>
                    </div>
                    <div class="flex justify-between text-lg font-bold text-gray-800 pt-1 border-t border-gray-100">
                        <span>Grand Total</span>
                        <span class="text-blue-600">{{ fmt(purchase.total) }}</span>
                    </div>
                    <div v-if="Number(purchase.paid) > 0" class="flex justify-between text-sm text-gray-600">
                        <span>Paid</span>
                        <span class="text-green-600 font-semibold">{{ fmt(purchase.paid) }}</span>
                    </div>
                </div>
            </div>

        </div>

        <ConfirmModal
            :show="showDeleteModal"
            title="Delete Purchase"
            :message="`Are you sure you want to delete ${purchase.grn_no}? This will permanently remove the purchase and all its items. Stock quantities will not be reversed automatically.`"
            confirm-label="Delete Purchase"
            :busy="deleting"
            @confirm="confirmDelete"
            @cancel="showDeleteModal = false"
        />
    </AuthenticatedLayout>
</template>

<style>
@media print {
    nav, header, aside, .no-print { display: none !important; }
    body { background: white; }
}
</style>
