<script setup>
import axios from 'axios';
import { ref, watch } from 'vue';
import { usePage } from '@inertiajs/vue3';

const props = defineProps({
    modelValue: { type: String, default: '' },
    folder:     { type: String, default: 'products' },
});

const emit = defineEmits(['update:modelValue']);

const IMAGEKIT_PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
const shop = usePage().props.device?.shop || 'default';

const pendingFile = ref(null);   // File object waiting to be uploaded
const preview     = ref(props.modelValue || ''); // blob URL or existing CDN URL
const error       = ref('');
const uploading   = ref(false);

watch(() => props.modelValue, (val) => {
    if (!pendingFile.value) preview.value = val || '';
});

function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        error.value = 'Only image files are allowed.';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        error.value = 'Image must be under 5MB.';
        return;
    }

    error.value    = '';
    pendingFile.value = file;

    // Show local preview immediately (no upload yet)
    const reader = new FileReader();
    reader.onload = (ev) => { preview.value = ev.target.result; };
    reader.readAsDataURL(file);
}

function removeImage() {
    pendingFile.value = null;
    preview.value     = '';
    error.value       = '';
    emit('update:modelValue', '');
}

// Called by parent form on submit — uploads if a file is pending, otherwise returns existing URL
async function upload() {
    if (!pendingFile.value) return props.modelValue || '';

    uploading.value = true;
    error.value     = '';

    try {
        const { data: auth } = await axios.get('/api/imagekit/auth');

        const formData = new FormData();
        formData.append('file', pendingFile.value);
        formData.append('fileName', props.folder + '-' + Date.now() + '-' + pendingFile.value.name.replace(/\s+/g, '-'));
        formData.append('folder',   '/' + shop + '/' + props.folder);
        formData.append('publicKey',  IMAGEKIT_PUBLIC_KEY);
        formData.append('signature',  auth.signature);
        formData.append('expire',     auth.expire);
        formData.append('token',      auth.token);

        const { data } = await axios.post(
            'https://upload.imagekit.io/api/v1/files/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        pendingFile.value = null;
        preview.value     = data.url;
        emit('update:modelValue', data.url);
        return data.url;
    } catch (err) {
        error.value = 'Upload failed. Please try again.';
        throw err;
    } finally {
        uploading.value = false;
    }
}

defineExpose({ upload, uploading });
</script>

<template>
    <div class="space-y-2">
        <!-- Preview (local blob or existing CDN URL) -->
        <div v-if="preview" class="relative inline-block">
            <img
                :src="preview"
                alt="Product image"
                class="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
            />
            <!-- Pending badge -->
            <span v-if="pendingFile" class="absolute bottom-1 left-1 bg-yellow-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                Pending
            </span>
            <button
                type="button"
                @click="removeImage"
                class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow"
                title="Remove image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Upload area (shown when no preview) -->
        <div v-else class="flex flex-col gap-2">
            <!-- Gallery pick -->
            <label class="flex items-center justify-center gap-2 w-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors px-3 py-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-xs text-gray-500">Choose Photo</span>
                <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
            </label>

            <!-- Camera capture (opens rear camera on phones) -->
            <label class="flex items-center justify-center gap-2 w-40 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors px-3 py-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="text-xs text-green-600">Take Photo</span>
                <input type="file" accept="image/*" capture="environment" class="hidden" @change="onFileChange" />
            </label>

            <span class="text-xs text-gray-300">Max 5MB</span>
        </div>

        <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>
    </div>
</template>
