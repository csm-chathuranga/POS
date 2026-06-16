import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.vue',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Noto Sans Sinhala', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                primary:  '#2563EB',
                sidebar:  '#1E293B',
                'app-bg': '#F8FAFC',
                success:  '#16A34A',
                warning:  '#F59E0B',
                danger:   '#DC2626',
                'app-text': '#0F172A',
                border:   '#E2E8F0',
            },
        },
    },

    plugins: [forms],
};
