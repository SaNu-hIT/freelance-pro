import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#DC143C",
          dark: "#8B0000",
          deep: "#2D0000",
          void: "#1A0000",
          muted: "#7F1D1D",
        },
        bg: {
          DEFAULT: "#030000",
          surface: "rgba(45,0,0,0.3)",
          card: "rgba(26,0,0,0.6)",
        },
        accent: {
          red: "#FF3B3B",
          muted: "#7F1D1D",
        },
      },
      fontFamily: {
        display: ["Cabinet Grotesk", "Inter", "sans-serif"],
        body: ["Satoshi", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "10xl": ["10rem", { lineHeight: "0.85" }],
        "9xl": ["8rem", { lineHeight: "0.85" }],
        "8xl": ["6rem", { lineHeight: "0.9" }],
      },
      letterSpacing: {
        "ultra": "0.4em",
        "wide-tech": "0.3em",
      },
      backgroundImage: {
        "gradient-dark": "linear-gradient(45deg, #030000, #1A0000)",
        "gradient-crimson": "linear-gradient(135deg, #8B0000, #DC143C)",
        "gradient-text": "linear-gradient(to bottom, #FFFFFF 30%, #DC143C 100%)",
        "grid-overlay":
          "repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(220,20,60,0.08) 80px), repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(220,20,60,0.08) 80px)",
      },
      backdropBlur: {
        glass: "16px",
      },
      boxShadow: {
        crimson: "0 0 30px rgba(220,20,60,0.5)",
        "crimson-sm": "0 0 15px rgba(220,20,60,0.3)",
        "card-hover": "0 20px 60px rgba(220,20,60,0.2)",
        glass: "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      animation: {
        "cube-rotate": "cubeRotate 12s linear infinite",
        "blob-morph": "blobMorph 18s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "ping-slow": "ping 2s cubic-bezier(0,0,0.2,1) infinite",
        "ticker": "ticker 30s linear infinite",
        "gradient-shift": "gradientShift 8s ease-in-out infinite",
        "text-reveal": "textReveal 0.8s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-up": "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "spin-slow": "spin 20s linear infinite",
      },
      keyframes: {
        cubeRotate: {
          "0%": { transform: "rotateX(0deg) rotateY(0deg)" },
          "100%": { transform: "rotateX(360deg) rotateY(360deg)" },
        },
        blobMorph: {
          "0%, 100%": {
            borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%",
            transform: "translate(0, 0) rotate(0deg)",
          },
          "33%": {
            borderRadius: "70% 30% 50% 50% / 30% 30% 70% 70%",
            transform: "translate(30px, -30px) rotate(120deg)",
          },
          "66%": {
            borderRadius: "100% 60% 60% 100% / 100% 100% 60% 60%",
            transform: "translate(-20px, 20px) rotate(240deg)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        textReveal: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeUp: {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(220,20,60,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(220,20,60,0.7)" },
        },
      },
      perspective: {
        "1000": "1000px",
        "1200": "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
