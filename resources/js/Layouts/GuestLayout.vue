<script setup>
import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';

const page = usePage();
const appSettings = computed(() => page.props.appSettings || {});
const shopName = computed(() => appSettings.value.shop_name || 'LUMAC POS');
const logo     = computed(() => appSettings.value.logo || null);
</script>

<template>
    <div class="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0" style="background-color:#F1F5F9;">
        <div class="mb-6 text-center">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 overflow-hidden" style="background-color:#2563EB;">
                <img v-if="logo" :src="logo" alt="Logo" class="w-full h-full object-contain" />
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            </div>
            <h1 class="text-2xl font-bold" style="color:#0F172A;">{{ shopName }}</h1>
            <p class="text-sm mt-1" style="color:#64748B;">Point of Sale System</p>
        </div>

        <div class="w-full sm:max-w-md px-6 py-6 bg-white shadow-sm overflow-hidden sm:rounded-2xl" style="border:1px solid #E2E8F0;">
            <slot />
        </div>
    </div>
</template>
