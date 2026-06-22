<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import InputError from '@/Components/InputError.vue';
import { Head, useForm, usePage } from '@inertiajs/vue3';
import { computed, inject } from 'vue';

defineProps({
    canResetPassword: { type: Boolean },
    status: { type: String },
});

const t = inject('t');

const form = useForm({
    email: '',
    password: '',
    remember: false,
});

const submit = () => {
    form.post(route('login'), {
        onFinish: () => form.reset('password'),
    });
};

function fillDemo(email) {
    form.email    = email;
    form.password = 'password';
}

const demoMode = computed(() => {
    const v = usePage().props.appSettings?.demo_mode;
    return v === '1' || v === true;
});

const demoUsers = [
    { label: 'Admin',    role: 'සියලු අයිතිවාසිකම්', email: 'admin@lmucpos.lk',    color: '#2563EB' },
    { label: 'Manager',  role: 'කළමනාකරණ',            email: 'manager@lmucpos.lk',  color: '#7C3AED' },
    { label: 'Cashier',  role: 'බිල්පත් කිරීම',        email: 'cashier@lmucpos.lk',  color: '#0891B2' },
];
</script>

<template>
    <GuestLayout>
        <Head :title="t('auth.title')" />

        <div v-if="status" class="mb-4 text-sm font-medium" style="color:#16A34A;">
            {{ status }}
        </div>

        <h2 class="text-lg font-bold mb-5" style="color:#0F172A;">{{ t('auth.title') }}</h2>

        <form @submit.prevent="submit" class="space-y-4">
            <!-- Email -->
            <div>
                <label class="block text-sm font-medium mb-1" style="color:#334155;">{{ t('auth.email') }}</label>
                <input
                    id="email"
                    v-model="form.email"
                    type="email"
                    required
                    autofocus
                    autocomplete="username"
                    class="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style="border:1px solid #E2E8F0; color:#0F172A;"
                />
                <InputError class="mt-1" :message="form.errors.email" />
            </div>

            <!-- Password -->
            <div>
                <label class="block text-sm font-medium mb-1" style="color:#334155;">{{ t('auth.password') }}</label>
                <input
                    id="password"
                    v-model="form.password"
                    type="password"
                    required
                    autocomplete="current-password"
                    class="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style="border:1px solid #E2E8F0; color:#0F172A;"
                />
                <InputError class="mt-1" :message="form.errors.password" />
            </div>

            <!-- Submit -->
            <button
                type="submit"
                :disabled="form.processing"
                class="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-opacity"
                :class="form.processing ? 'opacity-60' : ''"
                style="background-color:#2563EB;"
            >
                {{ form.processing ? t('auth.submitting') : t('auth.submit') }}
            </button>
        </form>

        <!-- Demo credentials -->
        <div v-if="demoMode" class="mt-6">
            <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color:#94A3B8;">{{ t('auth.demo_title') }}</p>
            <div class="space-y-2">
                <button
                    v-for="u in demoUsers"
                    :key="u.email"
                    type="button"
                    @click="fillDemo(u.email)"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:opacity-90"
                    :style="`background-color:${u.color}18; border:1px solid ${u.color}33;`"
                >
                    <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" :style="`background-color:${u.color};`">
                        {{ u.label[0] }}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold" :style="`color:${u.color};`">{{ u.label }}</p>
                        <p class="text-xs truncate" style="color:#64748B;">{{ u.email }}</p>
                    </div>
                    <div class="text-xs px-2 py-0.5 rounded font-medium" :style="`background-color:${u.color}22; color:${u.color};`">
                        {{ u.role }}
                    </div>
                </button>
            </div>
            <p class="text-xs text-center mt-2" style="color:#94A3B8;">{{ t('auth.demo_password') }}: <span class="font-mono font-semibold" style="color:#64748B;">password</span></p>
        </div>
    </GuestLayout>
</template>
