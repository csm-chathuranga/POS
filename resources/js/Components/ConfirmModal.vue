<script setup>
import Modal from '@/Components/Modal.vue';

defineProps({
    show:         { type: Boolean, default: false },
    title:        { type: String,  default: 'Confirm' },
    message:      { type: String,  default: 'Are you sure?' },
    confirmLabel: { type: String,  default: 'Delete' },
    busy:         { type: Boolean, default: false },
    variant:      { type: String,  default: 'danger' }, // danger | warning | primary
});

const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
    <Modal :show="show" max-width="md" :closeable="!busy" @close="emit('cancel')">
        <div class="p-6">
            <div class="flex items-start gap-4">
                <div
                    class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    :class="{
                        'bg-red-100': variant === 'danger',
                        'bg-amber-100': variant === 'warning',
                        'bg-blue-100': variant === 'primary',
                    }"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        :class="{
                            'text-red-600': variant === 'danger',
                            'text-amber-600': variant === 'warning',
                            'text-blue-600': variant === 'primary',
                        }"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path v-if="variant === 'danger'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-base font-bold text-gray-800">{{ title }}</h3>
                    <p class="text-sm text-gray-600 mt-1">{{ message }}</p>
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
                <button
                    type="button"
                    :disabled="busy"
                    class="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    @click="emit('cancel')"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    :disabled="busy"
                    class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
                    :class="{
                        'bg-red-600 hover:bg-red-700': variant === 'danger',
                        'bg-amber-500 hover:bg-amber-600': variant === 'warning',
                        'bg-blue-600 hover:bg-blue-700': variant === 'primary',
                    }"
                    @click="emit('confirm')"
                >
                    <svg v-if="busy" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    {{ busy ? 'Please wait…' : confirmLabel }}
                </button>
            </div>
        </div>
    </Modal>
</template>
