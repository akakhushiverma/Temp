/** @type {import('tailwindcss').Config} */
export default {
  // Enable class-based dark mode
  darkMode: 'class',

  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      // ---- Astral Color Palette ----
      colors: {
        // Deep space backgrounds
        astral: {
          void:    '#05060f',   // deepest background
          deep:    '#0a0b1a',   // primary background
          space:   '#0d0e24',   // card/panel background
          nebula:  '#12143a',   // elevated surface
          surface: '#1a1c4a',   // interactive surface
        },

        // Purple — primary accent (nebula glow)
        purple: {
          50:  '#f5f0ff',
          100: '#ede0ff',
          200: '#d8bfff',
          300: '#c09aff',
          400: '#a66fff',
          500: '#8b45ff',   // primary brand purple
          600: '#7c2ff5',
          700: '#6b1fd9',
          800: '#5a18b3',
          900: '#3d0d80',
          950: '#220050',
        },

        // Cyan — secondary accent (stardust trails)
        cyan: {
          50:  '#edfcff',
          100: '#d0f8ff',
          200: '#a4f0ff',
          300: '#63e5ff',
          400: '#1dd0f5',   // active/hover highlight
          500: '#00b5db',
          600: '#0091b8',
          700: '#007395',
          800: '#045e78',
          900: '#0a4e65',
          950: '#053345',
        },

        // Gold — warning / health score accent (ancient map ink)
        gold: {
          50:  '#fffbeb',
          100: '#fff3c6',
          200: '#ffe589',
          300: '#ffd24d',
          400: '#ffbc1f',   // primary gold
          500: '#f99b07',
          600: '#dd7302',
          700: '#b75006',
          800: '#943d0d',
          900: '#7a330f',
          950: '#461803',
        },

        // Red — critical / error (supernova)
        nova: {
          400: '#ff6b6b',
          500: '#ff4757',
          600: '#e8344a',
        },

        // Green — healthy / success (pulsar)
        pulsar: {
          400: '#56f3a0',
          500: '#2ecc71',
          600: '#27ae60',
        },
      },

      // ---- Typography ----
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },

      // ---- Spacing ----
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },

      // ---- Border Radius ----
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      // ---- Box Shadows — glowing effects ----
      boxShadow: {
        'glow-purple': '0 0 15px rgba(139, 69, 255, 0.5), 0 0 30px rgba(139, 69, 255, 0.25)',
        'glow-cyan':   '0 0 15px rgba(29, 208, 245, 0.5), 0 0 30px rgba(29, 208, 245, 0.25)',
        'glow-gold':   '0 0 15px rgba(255, 188, 31, 0.5), 0 0 30px rgba(255, 188, 31, 0.25)',
        'glow-nova':   '0 0 15px rgba(255, 71, 87, 0.5),  0 0 30px rgba(255, 71, 87, 0.25)',
        'panel':       '0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)',
        'node':        '0 0 12px rgba(139, 69, 255, 0.8)',
      },

      // ---- Background Gradients ----
      backgroundImage: {
        'astral-gradient':  'linear-gradient(135deg, #0a0b1a 0%, #12143a 50%, #0d0e24 100%)',
        'purple-glow':      'radial-gradient(circle, rgba(139,69,255,0.2) 0%, transparent 70%)',
        'cyan-glow':        'radial-gradient(circle, rgba(29,208,245,0.15) 0%, transparent 70%)',
        'nebula-mesh':      'radial-gradient(at 40% 20%, rgba(139,69,255,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(29,208,245,0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(139,69,255,0.1) 0px, transparent 50%)',
        'health-gradient':  'linear-gradient(90deg, #ff4757 0%, #ffbc1f 50%, #2ecc71 100%)',
      },

      // ---- Animations ----
      keyframes: {
        // Node pulsing for the D3 graph
        'node-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':       { opacity: '0.7', transform: 'scale(1.15)' },
        },
        // Slow rotation for ambient background elements
        'slow-spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Glow breathing effect
        'glow-breathe': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(139,69,255,0.3)' },
          '50%':       { boxShadow: '0 0 30px rgba(139,69,255,0.8), 0 0 60px rgba(139,69,255,0.4)' },
        },
        // Stardust twinkle
        'twinkle': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.2' },
        },
        // Slide in from right (for panels)
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        // Slide in from left
        'slide-in-left': {
          '0%':   { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',      opacity: '1' },
        },
        // Fade-up entrance
        'fade-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        // Shimmer for loading skeleton
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Orbit for decorative ring elements
        'orbit': {
          '0%':   { transform: 'rotate(0deg) translateX(60px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(60px) rotate(-360deg)' },
        },
      },

      animation: {
        'node-pulse':      'node-pulse 2s ease-in-out infinite',
        'slow-spin':       'slow-spin 20s linear infinite',
        'glow-breathe':    'glow-breathe 3s ease-in-out infinite',
        'twinkle':         'twinkle 3s ease-in-out infinite',
        'twinkle-slow':    'twinkle 5s ease-in-out infinite',
        'slide-in-right':  'slide-in-right 0.3s ease-out',
        'slide-in-left':   'slide-in-left 0.3s ease-out',
        'fade-up':         'fade-up 0.4s ease-out',
        'shimmer':         'shimmer 1.5s infinite linear',
        'orbit':           'orbit 8s linear infinite',
      },

      // ---- Backdrop Blur ----
      backdropBlur: {
        xs: '2px',
      },

      // ---- Transition Timing ----
      transitionTimingFunction: {
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },

  plugins: [],
};
