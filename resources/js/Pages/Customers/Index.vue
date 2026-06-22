<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import ConfirmModal from '@/Components/ConfirmModal.vue';
import { Head, Link, router } from '@inertiajs/vue3';
import { ref, watch, inject } from 'vue';

const props = defineProps({
    customers: { type: Object, default: () => ({ data: [], links: [] }) },
    filters: { type: Object, default: () => ({}) },
});

const t = inject('t');

const search = ref(props.filters?.search || '');

let searchTimer = null;
watch(search, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        router.get(route('customers.index'), { search: search.value }, { preserveState: true, replace: true });
    }, 400);
});

function formatCurrency(value) {
    return 'Rs. ' + Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const deleteTarget = ref(null);
const deleting = ref(false);

function promptDelete(id, name) {
    deleteTarget.value = { id, name };
}

function doDelete() {
    deleting.value = true;
    router.delete(route('customers.destroy', deleteTarget.value.id), {
        onFinish: () => { deleting.value = false; deleteTarget.value = null; },
    });
}
</script>

<template>
    <Head :title="t('page.customers')" />

    <AuthenticatedLayout>
        <template #header>
            <h1 class="text-xl font-bold text-gray-800">{{ t('page.customers') }}</h1>
        </template>

        <div class="flex flex-col sm:flex-row gap-3 mb-4">
            <div class="flex-1 relative">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    v-model="search"
                    type="text"
                    :placeholder="t('btn.search') + '...'"
                    class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
            </div>
            <Link
                :href="route('customers.create')"
                class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                {{ t('btn.create') }}
            </Link>
        </div>

        <!-- Mobile cards -->
        <div class="md:hidden space-y-3 mb-4">
            <div v-if="customers.data?.length === 0" class="bg-white rounded-xl p-6 text-center text-gray-400">
                {{ t('cust.no_customers') }}
            </div>
            <div
                v-for="customer in customers.data"
                :key="customer.id"
                class="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-semibold text-gray-900">{{ customer.name }}</p>
                        <p v-if="customer.phone" class="text-sm text-gray-500">{{ customer.phone }}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-400">{{ t('lbl.credit_balance') }}</p>
                        <p class="text-sm font-semibold" :class="customer.credit_balance > 0 ? 'text-red-600' : 'text-gray-700'">
                            {{ formatCurrency(customer.credit_balance) }}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <Link
                        :href="route('customers.edit', customer.id)"
                        class="flex-1 text-center bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center"
                    >
                        {{ t('btn.edit') }}
                    </Link>
                    <button
                        @click="promptDelete(customer.id, customer.name)"
                        class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                    >
                        {{ t('btn.delete') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Desktop table -->
        <div class="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <table class="w-full">
                <thead>
                    <tr class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        <th class="px-4 py-3">{{ t('th.name') }}</th>
                        <th class="px-4 py-3">{{ t('th.phone') }}</th>
                        <th class="px-4 py-3">{{ t('th.email') }}</th>
                        <th class="px-4 py-3">{{ t('lbl.credit_limit') }}</th>
                        <th class="px-4 py-3">{{ t('lbl.credit_balance') }}</th>
                        <th class="px-4 py-3 text-right">{{ t('th.actions') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <tr v-if="customers.data?.length === 0">
                        <td colspan="6" class="px-4 py-8 text-center text-gray-400">{{ t('cust.no_customers') }}</td>
                    </tr>
                    <tr
                        v-for="customer in customers.data"
                        :key="customer.id"
                        class="hover:bg-gray-50 transition-colors"
                    >
                        <td class="px-4 py-3 font-medium text-gray-900">{{ customer.name }}</td>
                        <td class="px-4 py-3 text-gray-600">{{ customer.phone || '-' }}</td>
                        <td class="px-4 py-3 text-gray-600">{{ customer.email || '-' }}</td>
                        <td class="px-4 py-3 text-gray-600">{{ formatCurrency(customer.credit_limit) }}</td>
                        <td class="px-4 py-3 font-medium" :class="customer.credit_balance > 0 ? 'text-red-600' : 'text-gray-700'">
                            {{ formatCurrency(customer.credit_balance) }}
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center justify-end gap-2">
                                <Link
                                    :href="route('customers.edit', customer.id)"
                                    class="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 rounded hover:bg-blue-50 min-h-[36px] flex items-center"
                                >
                                    {{ t('btn.edit') }}
                                </Link>
                                <button
                                    @click="promptDelete(customer.id, customer.name)"
                                    class="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1.5 rounded hover:bg-red-50 min-h-[36px]"
                                >
                                    {{ t('btn.delete') }}
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div v-if="customers.links?.length > 3" class="flex flex-wrap justify-center gap-1">
            <template v-for="link in customers.links" :key="link.label">
                <Link
                    v-if="link.url"
                    :href="link.url"
                    class="px-3 py-2 text-sm rounded-lg border transition-colors min-h-[44px] flex items-center"
                    :class="link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
                    v-html="link.label"
                />
                <span
                    v-else
                    class="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-400 min-h-[44px] flex items-center"
                    v-html="link.label"
                />
            </template>
        </div>
    </AuthenticatedLayout>

    <ConfirmModal
        :show="!!deleteTarget"
        title="Delete Customer"
        :message="`Are you sure you want to delete &quot;${deleteTarget?.name}&quot;? This cannot be undone.`"
        confirm-label="Delete Customer"
        :busy="deleting"
        @confirm="doDelete"
        @cancel="deleteTarget = null"
    />
</template>
