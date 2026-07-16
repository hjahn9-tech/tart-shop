"use client";

import { useRef, useState } from "react";

// 게임 임베드 + 재생/전체화면 버튼.
// 작은 임베드에서는 포인터 잠금/키보드 포커스가 잘 안 잡히므로 전체화면이 기본 플레이 방식.
export function GamePlayer({
  src,
  title,
  width,
  height,
}: {
  src: string;
  title: string;
  width: number;
  height: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [started, setStarted] = useState(false);

  async function enterFullscreen() {
    const el = wrapRef.current as
      | (HTMLDivElement & {
          webkitRequestFullscreen?: () => Promise<void> | void;
        })
      | null;
    try {
      if (el?.requestFullscreen) await el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      /* 전체화면 거부 시 임베드 상태로 계속 플레이 */
    }
    // 키보드 입력이 게임으로 가도록 포커스
    setTimeout(() => iframeRef.current?.focus(), 60);
  }

  async function play() {
    setStarted(true);
    await enterFullscreen();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 글라스 베젤 + 게임 프레임 */}
      <div className="liquid-glass rounded-[30px] p-2.5 shadow-tart-lg">
        <div
          ref={wrapRef}
          className="game-player relative overflow-hidden rounded-3xl bg-black"
          style={{ width, height, maxWidth: "100%" }}
        >
          <iframe
            ref={iframeRef}
            src={src}
            title={title}
            className="block h-full w-full border-0"
            allow="autoplay; fullscreen; pointer-lock; gamepad; accelerometer; gyroscope"
            allowFullScreen
          />

          {/* 최초 재생 오버레이 (프레임 안, 큰 재생 버튼) */}
          {!started && (
            <button
              onClick={play}
              aria-label={`${title} 재생`}
              className="group absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/45 backdrop-blur-[1px] transition-colors hover:bg-black/35"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-berry pl-1 text-white shadow-glow transition-transform duration-200 group-hover:scale-110">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="text-sm font-medium text-white/90">재생</span>
            </button>
          )}
        </div>
      </div>

      {/* 프레임 바깥 · 크고 명확한 전체화면 버튼 */}
      <button
        onClick={play}
        className="inline-flex items-center gap-2 rounded-full bg-berry px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 active:scale-[0.98]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m0 8v3a2 2 0 0 0 2 2h3m8-18h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3" />
        </svg>
        전체화면으로 플레이
      </button>
      <p className="text-xs text-cocoa/40">나가기는 Esc</p>
    </div>
  );
}
