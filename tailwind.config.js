/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pachaxDark: '#0B132B',
        pachaxNavy: '#1C2541',
        pachaxNavyLight: '#2A365C',
        pachaxCyan: '#00F0FF',
        pachaxCyanDark: '#00B4D8',
        pachaxCyanGlow: 'rgba(0, 240, 255, 0.25)',

        canvas: '#070C1A',
        panel: '#111D37',
        panelLight: '#162447',
        panelBorder: '#1E2D50',
        ink: '#F8FAFC',
        muted: '#94A3B8',
        mutedDark: '#64748B',
        line: '#1E293B',
        lineStrong: '#334155',
        accent: '#00F0FF',
        accentStrong: '#00B4D8',
        accentSoft: 'rgba(0, 240, 255, 0.12)',
        accentWash: 'rgba(0, 240, 255, 0.05)',
        success: '#10B981',
        successSoft: 'rgba(16, 185, 129, 0.15)',
        warning: '#F59E0B',
        warningSoft: 'rgba(245, 158, 11, 0.15)',
        danger: '#EF4444',
        dangerSoft: 'rgba(239, 68, 68, 0.15)',
      },
      boxShadow: {
        float: '0 20px 50px -12px rgba(0, 240, 255, 0.15), 0 0 20px rgba(11, 19, 43, 0.8)',
        card: '0 10px 30px -10px rgba(11, 19, 43, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        cyanGlow: '0 0 25px rgba(0, 240, 255, 0.35)',
        insetSoft: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
