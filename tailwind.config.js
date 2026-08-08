import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    // Les composants de formulaire passent tous par Ant Design désormais ;
    // le plugin @tailwindcss/forms forçait un style natif (fond blanc, bordure
    // grise) qui entrait en conflit avec le thème clair/sombre d'antd.
    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
        },
    },

    plugins: [],
};
