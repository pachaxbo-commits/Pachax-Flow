/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f6efe7',
        panel: '#fffaf6',
        ink: '#211b17',
        muted: '#7d6f64',
        line: '#e7dbcf',
        lineStrong: '#d7c4b4',
        accent: '#c55b33',
        accentStrong: '#ab4724',
        accentSoft: '#f4ddd1',
        accentWash: '#fbf1eb',
        success: '#3b6b52',
        successSoft: '#e7f2eb',
        warning: '#a46321',
        warningSoft: '#f7ecdc',
      },
      boxShadow: {
        float: '0 24px 70px -34px rgba(35, 24, 21, 0.28)',
        card: '0 18px 40px -28px rgba(38, 27, 20, 0.22)',
        insetSoft: 'inset 0 1px 0 rgba(255, 255, 255, 0.75)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'serif'],
      },
    },
  },
  plugins: [],
}
