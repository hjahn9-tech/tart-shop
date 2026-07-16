import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Instrument Serif", "serif"],
      },
      // 다크 프리미엄(디저트 부티크) 팔레트.
      // 토큰 의미를 다크 테마에 맞게 매핑: cream=배경(딥 코코아), cocoa=라이트 전경.
      colors: {
        cream: "#160f0b", // 페이지 배경 (딥 코코아/차콜)
        surface: "#20160f", // 카드·패널 표면
        cocoa: "#f3e9dd", // 주 전경(따뜻한 오프화이트)
        crust: "#caa06e", // 카라멜 — 은은한 테두리/보조
        caramel: "#e0a45c", // 보조 액센트
        berry: "#b3164f", // 메인 액센트
      },
      boxShadow: {
        tart: "0 10px 30px -14px rgba(0,0,0,.65)",
        "tart-lg": "0 24px 60px -20px rgba(0,0,0,.75)",
        glow: "0 0 24px -4px rgba(179,22,79,.45)",
      },
    },
  },
  plugins: [],
};

export default config;
