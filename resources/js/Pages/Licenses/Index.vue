<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import ConfirmModal from '@/Components/ConfirmModal.vue';
import { Head, useForm, router } from '@inertiajs/vue3';
import { ref } from 'vue';

const props = defineProps({
    licenses: { type: Array, default: () => [] },
});

const form = useForm({ customer_name: '', type: 'trial', notes: '' });

function submit() {
    form.post(route('licenses.store'), { onSuccess: () => form.reset() });
}

// Pending action modal: { id, type: 'upgrade'|'reset'|'delete' }
const pendingAction = ref(null);
const actionBusy = ref(false);

const ACTION_CONFIG = {
    upgrade: {
        title: 'Upgrade License',
        message: 'Upgrade this license to paid (no expiry)? This cannot be reversed.',
        confirmLabel: 'Upgrade',
        variant: 'primary',
    },
    reset: {
        title: 'Reset License',
        message: 'Reset this license? The machine will need to re-activate.',
        confirmLabel: 'Reset',
        variant: 'warning',
    },
    delete: {
        title: 'Delete License',
        message: 'Delete this license key permanently? This cannot be undone.',
        confirmLabel: 'Delete',
        variant: 'danger',
    },
};

function upgradeLicense(id) { pendingAction.value = { id, type: 'upgrade' }; }
function resetLicense(id)   { pendingAction.value = { id, type: 'reset' };   }
function deleteLicense(id)  { pendingAction.value = { id, type: 'delete' };  }

function doAction() {
    actionBusy.value = true;
    const id = pendingAction.value.id;
    const done = () => { actionBusy.value = false; pendingAction.value = null; };
    if (pendingAction.value.type === 'upgrade') {
        router.post(route('licenses.upgrade', id), {}, { onFinish: done });
    } else if (pendingAction.value.type === 'reset') {
        router.patch(route('licenses.update', id), { is_active: true }, { onFinish: done });
    } else {
        router.delete(route('licenses.destroy', id), { onFinish: done });
    }
}

function copyKey(key) {
    navigator.clipboard.writeText(key);
}
</script>

<template>
    <Head title="License Keys" />

    <AuthenticatedLayout>
        <template #header>
            <h1 class="text-xl font-bold" style="color:#0F172A;">License Keys</h1>
        </template>

        <!-- Generate new key -->
        <div class="bg-white rounded-xl shadow-sm p-6 mb-6" style="border:1px solid #E2E8F0;">
            <h2 class="text-sm font-semibold text-slate-700 mb-4">Generate New License Key</h2>
            <form @submit.prevent="submit" class="flex gap-3 flex-wrap">
                <input
                    v-model="form.customer_name"
                    type="text"
                    placeholder="Customer / Shop name"
                    required
                    class="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                    v-model="form.type"
                    class="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="trial">Trial (14 days)</option>
                    <option value="paid">Paid (no expiry)</option>
                </select>
                <input
                    v-model="form.notes"
                    type="text"
                    placeholder="Notes (optional)"
                    class="flex-1 min-w-[160px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    :disabled="form.processing"
                    class="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                    style="background:#2563EB;"
                >
                    Generate Key
                </button>
            </form>
        </div>

        <!-- License list -->
        <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border:1px solid #E2E8F0;">
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-left text-xs font-semibold text-slate-500 uppercase bg-slate-50" style="border-bottom:1px solid #E2E8F0;">
                        <th class="px-4 py-3">License Key</th>
                        <th class="px-4 py-3">Customer</th>
                        <th class="px-4 py-3">MAC Address</th>
                        <th class="px-4 py-3">Activated</th>
                        <th class="px-4 py-3">Expires</th>
                        <th class="px-4 py-3">Status</th>
                        <th class="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-if="licenses.length === 0">
                        <td colspan="7" class="px-4 py-8 text-center text-slate-400">No license keys yet.</td>
                    </tr>
                    <tr v-for="lic in licenses" :key="lic.id" class="hover:bg-slate-50">
                        <!-- Key -->
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                                <code class="font-mono text-blue-600 font-semibold tracking-widest">{{ lic.key }}</code>
                                <button @click="copyKey(lic.key)" title="Copy" class="text-slate-400 hover:text-slate-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block"
                                :class="lic.type === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'">
                                {{ lic.type === 'paid' ? 'Paid' : 'Trial' }}
                            </span>
                            <p v-if="lic.notes" class="text-xs text-slate-400 mt-0.5">{{ lic.notes }}</p>
                        </td>
                        <!-- Customer -->
                        <td class="px-4 py-3 font-medium text-slate-700">{{ lic.customer_name || '—' }}</td>
                        <!-- MAC -->
                        <td class="px-4 py-3">
                            <code v-if="lic.mac_address" class="text-xs text-slate-500">{{ lic.mac_address }}</code>
                            <span v-else class="text-slate-300 text-xs">not activated</span>
                        </td>
                        <!-- Activated date -->
                        <td class="px-4 py-3 text-slate-500 text-xs">
                            {{ lic.activated_at ? new Date(lic.activated_at).toLocaleDateString() : '—' }}
                        </td>
                        <!-- Expires -->
                        <td class="px-4 py-3 text-xs">
                            <span v-if="!lic.expires_at" class="text-slate-400">No expiry</span>
                            <span v-else-if="new Date(lic.expires_at) < new Date()" class="text-red-600 font-semibold">Expired</span>
                            <span v-else class="text-amber-600">{{ new Date(lic.expires_at).toLocaleDateString() }}</span>
                        </td>
                        <!-- Status -->
                        <td class="px-4 py-3">
                            <span class="text-xs font-medium px-2 py-1 rounded-full"
                                :class="!lic.mac_address ? 'bg-slate-100 text-slate-500'
                                    : new Date(lic.expires_at) < new Date() && lic.expires_at ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'">
                                {{ !lic.mac_address ? 'Unused' : (lic.expires_at && new Date(lic.expires_at) < new Date()) ? 'Expired' : 'Active' }}
                            </span>
                        </td>
                        <!-- Actions -->
                        <td class="px-4 py-3">
                            <div class="flex items-center justify-end gap-2 flex-wrap">
                                <button
                                    v-if="lic.type === 'trial'"
                                    @click="upgradeLicense(lic.id)"
                                    class="text-xs px-3 py-1.5 rounded text-blue-600 hover:bg-blue-50 font-medium border border-blue-200"
                                >
                                    Upgrade → Paid
                                </button>
                                <button
                                    v-if="lic.mac_address"
                                    @click="resetLicense(lic.id)"
                                    class="text-xs px-3 py-1.5 rounded text-amber-600 hover:bg-amber-50 font-medium"
                                >
                                    Reset
                                </button>
                                <button
                                    @click="deleteLicense(lic.id)"
                                    class="text-xs px-3 py-1.5 rounded text-red-600 hover:bg-red-50 font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </AuthenticatedLayout>

    <ConfirmModal
        v-if="pendingAction"
        :show="!!pendingAction"
        :title="ACTION_CONFIG[pendingAction.type].title"
        :message="ACTION_CONFIG[pendingAction.type].message"
        :confirm-label="ACTION_CONFIG[pendingAction.type].confirmLabel"
        :variant="ACTION_CONFIG[pendingAction.type].variant"
        :busy="actionBusy"
        @confirm="doAction"
        @cancel="pendingAction = null"
    />
</template>
