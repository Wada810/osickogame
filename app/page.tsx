"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from './styles.module.css';
import { useAudio } from './hooks/useAudio';

export default function Home() {
  const router = useRouter();
  const { bgmVolume, setBgmVolume, seVolume, setSeVolume, startBGM, playSE } = useAudio();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("osicko_username");
    if (saved) setUsername(saved);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    localStorage.setItem("osicko_username", val);
  };

  return (
    <div className={styles.container}>
      <div className={styles.startScreen}>
        <h1 className={styles.gameTitle}>OSICKO GAME</h1>
        
        <div className={styles.volumeControls}>
           <label className={styles.volumeLabel}>
              BGM Volume: {Math.round(bgmVolume * 100)}%
              <input type="range" min="0" max="1" step="0.05" value={bgmVolume} onChange={(e) => setBgmVolume(Number(e.target.value))} />
           </label>
           <label className={styles.volumeLabel}>
              SE Volume: {Math.round(seVolume * 100)}%
              <input type="range" min="0" max="1" step="0.05" value={seVolume} onChange={(e) => {
                  setSeVolume(Number(e.target.value));
                  playSE("click");
              }} />
           </label>
        </div>

        <div className={styles.volumeControls}>
           <label className={styles.volumeLabel}>
              Player Name
              <input 
                 type="text" 
                 value={username} 
                 onChange={handleNameChange} 
                 placeholder="名前を入力..." 
                 className={styles.nameInput}
              />
           </label>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button 
             className={styles.startButton} 
             onClick={() => {
                playSE("click");
                startBGM();
                router.push("/offline");
             }}
          >
            OFFLINE (CPU)
          </button>
          
          <button 
             className={styles.startButton} 
             style={{ backgroundColor: "#10b981", boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)" }}
             onClick={() => {
                playSE("click");
                startBGM();
                router.push("/online");
             }}
          >
            ONLINE PvP
          </button>
        </div>
      </div>
    </div>
  );
}
