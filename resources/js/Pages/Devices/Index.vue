<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, router, usePage } from '@inertiajs/vue3';
import { ref, computed, reactive } from 'vue';

const props = defineProps({
    devices: { type: Object, default: () => ({}) },
});

const page = usePage();
const flash = computed(() => page.props.flash);

// ── Device list as array ──────────────────────────────────────────────────────
const deviceList = computed(() =>
    Object.entries(props.devices).map(([mac, info]) => ({ mac, ...info }))
);

// ── Add form ──────────────────────────────────────────────────────────────────
const showAdd   = ref(false);
const addBusy   = ref(false);
const addErrors = ref({});
const addForm   = reactive({ mac: '', shop: '', db: '' });

function openAdd() {
    Object.assign(addForm, { mac: '', shop: '', db: '' });
    addErrors.value = {};
    showAdd.value   = true;
}

function autoDb() {
    if (addForm.shop && !addForm.db) {
        addForm.db = addForm.shop.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.sqlite';
    }
}

function submitAdd() {
    addBusy.value   = true;
    addErrors.value = {};
    router.post(route('devices.store'), addForm, {
        onError:  (e) => { addErrors.value = e; },
        onSuccess: () => { showAdd.value = false; },
        onFinish: () => { addBusy.value = false; },
    });
}

// ── Edit form ─────────────────────────────────────────────────────────────────
const editTarget = ref(null);
const editBusy   = ref(false);
const editErrors = ref({});
const editForm   = reactive({ shop: '', db: '' });

function openEdit(device) {
    editTarget.value = device.mac;
    Object.assign(editForm, { shop: device.shop, db: device.db });
    editErrors.value = {};
}

function submitEdit() {
    editBusy.value   = true;
    editErrors.value = {};
    router.put(route('devices.update', { mac: editTarget.value }), editForm, {
        onError:  (e) => { editErrors.value = e; },
        onSuccess: () => { editTarget.value = null; },
        onFinish: () => { editBusy.value = false; },
    });
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteTarget  = ref(null);
const deleteDb      = ref(false);
const deleteBusy    = ref(false);

function openDelete(device) {
    deleteTarget.value = device;
    deleteDb.value     = false;
}

function confirmDelete() {
    deleteBusy.value = true;
    router.delete(route('devices.destroy', { mac: deleteTarget.value.mac }), {
        data:     { delete_db: deleteDb.value },
        onSuccess: () => { deleteTarget.value = null; },
        onFinish: () => { deleteBusy.value = false; },
    });
}
</script>

<template>
    <Head title="Device Registry" />

    <AuthenticatedLayout>
        <template #header>
            <h1 class="text-xl font-bold text-gray-800">Device Registry</h1>
        </template>

        <!-- Flash -->
        <div v-if="flash?.success" class="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {{ flash.success }}
        </div>
        <div v-if="flash?.error" class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {{ flash.error }}
        </div>

        <!-- Header row -->
        <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-gray-500">{{ deviceList.length }} device(s) registered</p>
            <button
                @click="openAdd"
                class="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Device
            </button>
        </div>

        <!-- Empty state -->
        <div v-if="deviceList.length === 0" class="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p class="text-gray-400 text-sm">No devices registered yet.</p>
            <button @click="openAdd" class="mt-3 text-blue-600 text-sm font-medium hover:underline">Register your first device</button>
        </div>

        <!-- Table (desktop) -->
        <div v-else class="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th class="text-left px-5 py-3 font-semibold text-gray-600">Shop Name</th>
                        <th class="text-left px-5 py-3 font-semibold text-gray-600">MAC Address</th>
                        <th class="text-left px-5 py-3 font-semibold text-gray-600">Database File</th>
                        <th class="px-5 py-3"></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    <template v-for="device in deviceList" :key="device.mac">
                        <!-- View row -->
                        <tr v-if="editTarget !== device.mac" class="hover:bg-gray-50 transition-colors">
                            <td class="px-5 py-4">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <span class="text-indigo-600 font-bold text-xs">{{ device.shop?.charAt(0)?.toUpperCase() }}</span>
                                    </div>
                                    <span class="font-medium text-gray-900">{{ device.shop }}</span>
                                </div>
                            </td>
                            <td class="px-5 py-4 font-mono text-gray-600">{{ device.mac }}</td>
                            <td class="px-5 py-4">
                                <span class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded px-2 py-0.5 text-xs font-mono">
                                    {{ device.db }}
                                </span>
                            </td>
                            <td class="px-5 py-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button
                                        @click="openEdit(device)"
                                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    >Edit</button>
                                    <button
                                        @click="openDelete(device)"
                                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    >Delete</button>
                                </div>
                            </td>
                        </tr>

                        <!-- Inline edit row -->
                        <tr v-else class="bg-blue-50">
                            <td class="px-5 py-3">
                                <input
                                    v-model="editForm.shop"
                                    type="text"
                                    placeholder="Shop name"
                                    class="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                />
                                <p v-if="editErrors.shop" class="text-red-500 text-xs mt-1">{{ editErrors.shop }}</p>
                            </td>
                            <td class="px-5 py-3 font-mono text-gray-400 text-xs">{{ device.mac }}</td>
                            <td class="px-5 py-3">
                                <input
                                    v-model="editForm.db"
                                    type="text"
                                    placeholder="filename.sqlite"
                                    class="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-400"
                                />
                                <p v-if="editErrors.db" class="text-red-500 text-xs mt-1">{{ editErrors.db }}</p>
                            </td>
                            <td class="px-5 py-3 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button
                                        @click="submitEdit"
                                        :disabled="editBusy"
                                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >{{ editBusy ? 'Saving…' : 'Save' }}</button>
                                    <button
                                        @click="editTarget = null"
                                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
                                    >Cancel</button>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <!-- Cards (mobile) -->
        <div class="md:hidden space-y-3">
            <div
                v-for="device in deviceList"
                :key="device.mac"
                class="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span class="text-indigo-600 font-bold">{{ device.shop?.charAt(0)?.toUpperCase() }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-gray-900">{{ device.shop }}</p>
                        <p class="text-xs font-mono text-gray-500 truncate">{{ device.mac }}</p>
                    </div>
                </div>
                <p class="text-xs text-gray-400 mb-3">
                    DB: <span class="font-mono text-gray-600">{{ device.db }}</span>
                </p>
                <div class="flex gap-2">
                    <button
                        @click="openEdit(device)"
                        class="flex-1 text-center bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors min-h-[44px]"
                    >Edit</button>
                    <button
                        @click="openDelete(device)"
                        class="flex-1 text-center bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors min-h-[44px]"
                    >Delete</button>
                </div>

                <!-- Mobile inline edit -->
                <div v-if="editTarget === device.mac" class="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <input v-model="editForm.shop" type="text" placeholder="Shop name"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" />
                    <input v-model="editForm.db" type="text" placeholder="filename.sqlite"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none" />
                    <div class="flex gap-2">
                        <button @click="submitEdit" :disabled="editBusy"
                            class="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                            {{ editBusy ? 'Saving…' : 'Save' }}
                        </button>
                        <button @click="editTarget = null"
                            class="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </AuthenticatedLayout>

    <!-- ── Add modal ─────────────────────────────────────────────────────────── -->
    <Teleport to="body">
        <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.45);">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" @click.stop>
                <h2 class="text-lg font-bold text-gray-900 mb-5">Register New Device</h2>

                <div class="space-y-4">
                    <!-- Shop name -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                        <input
                            v-model="addForm.shop"
                            @blur="autoDb"
                            type="text"
                            placeholder="Main Branch"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                        <p v-if="addErrors.shop" class="text-red-500 text-xs mt-1">{{ addErrors.shop }}</p>
                    </div>

                    <!-- MAC address -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
                        <input
                            v-model="addForm.mac"
                            type="text"
                            placeholder="aa:bb:cc:dd:ee:ff"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                        <p class="text-gray-400 text-xs mt-1">Lowercase with colons. Found in Settings → Device Info.</p>
                        <p v-if="addErrors.mac" class="text-red-500 text-xs mt-1">{{ addErrors.mac }}</p>
                    </div>

                    <!-- DB filename -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Database Filename</label>
                        <input
                            v-model="addForm.db"
                            type="text"
                            placeholder="branch-name.sqlite"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                        <p class="text-gray-400 text-xs mt-1">Auto-filled from shop name. Existing DB will be copied as base.</p>
                        <p v-if="addErrors.db" class="text-red-500 text-xs mt-1">{{ addErrors.db }}</p>
                    </div>
                </div>

                <div class="flex gap-3 mt-6">
                    <button
                        @click="submitAdd"
                        :disabled="addBusy"
                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                    >{{ addBusy ? 'Creating…' : 'Register Device' }}</button>
                    <button
                        @click="showAdd = false"
                        class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    >Cancel</button>
                </div>
            </div>
        </div>
    </Teleport>

    <!-- ── Delete confirm modal ───────────────────────────────────────────────── -->
    <Teleport to="body">
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.45);">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" @click.stop>
                <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 class="text-lg font-bold text-gray-900 text-center mb-1">Remove Device?</h2>
                <p class="text-sm text-gray-500 text-center mb-4">
                    <span class="font-semibold text-gray-700">{{ deleteTarget.shop }}</span>
                    ({{ deleteTarget.mac }}) will be removed from the registry.
                </p>

                <label class="flex items-center gap-2 mb-5 cursor-pointer select-none">
                    <input v-model="deleteDb" type="checkbox" class="w-4 h-4 rounded accent-red-600" />
                    <span class="text-sm text-gray-600">Also delete the database file <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">{{ deleteTarget.db }}</code></span>
                </label>

                <div class="flex gap-3">
                    <button
                        @click="confirmDelete"
                        :disabled="deleteBusy"
                        class="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                    >{{ deleteBusy ? 'Removing…' : 'Remove' }}</button>
                    <button
                        @click="deleteTarget = null"
                        class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    >Cancel</button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
