import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudio() {
  const [bgmVolume, setBgmVolume] = useState(0.3); // デフォルト音量30%
  const [seVolume, setSeVolume] = useState(0.5);   // デフォルト音量50%
  
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);
  const selectRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      bgmRef.current = new Audio("/sounds/bgm.mp3");
      bgmRef.current.loop = true;
      
      clickRef.current = new Audio("/sounds/click.mp3");
      selectRef.current = new Audio("/sounds/select.mp3");
    }
  }, []);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  useEffect(() => {
    if (clickRef.current) clickRef.current.volume = seVolume;
    if (selectRef.current) selectRef.current.volume = seVolume;
  }, [seVolume]);

  const startBGM = useCallback(() => {
    if (bgmRef.current) {
        bgmRef.current.play().catch(e => console.error("BGM play failed:", e));
    }
  }, []);

  const playSE = useCallback((type: "click" | "select") => {
    const audio = type === "click" ? clickRef.current : selectRef.current;
    if (audio) {
      audio.currentTime = 0; // すぐに最初から鳴らす
      audio.play().catch(e => console.error("SE play failed:", e));
    }
  }, []);

  return { bgmVolume, setBgmVolume, seVolume, setSeVolume, startBGM, playSE };
}
