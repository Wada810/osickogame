"use client";

import React, { useState } from "react";
import {
  GameState,
  Player,
  CardType,
  createInitialState,
  applyMove,
  getValidMoves,
  isGameOver,
  getWinner,
  Cell
} from "./gameState";
import styles from './styles.module.css';
import { useAudio } from './hooks/useAudio';

const CARD_ICONS: Record<CardType, string> = {
  normal: "/normal.png",
  brave: "/brave.png",
  cleaner: "/cleaner.png",
  block: "/block.png"
};

const CARD_NAMES: Record<CardType, string> = {
  normal: "Normal",
  brave: "Brave",
  cleaner: "Cleaner",
  block: "Block"
};

export default function Home() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [appScreen, setAppScreen] = useState<"title" | "play">("title");

  const { bgmVolume, setBgmVolume, seVolume, setSeVolume, startBGM, playSE } = useAudio();

  // Hydrationエラー防止のため、ランダムにカードを引く初期化処理はクライアントサイドでのみ実行
  React.useEffect(() => {
    setGameState(createInitialState());
  }, []);

  // --- CPU (NPC) Logic ---
  React.useEffect(() => {
    if (appScreen !== "play") return;
    if (!gameState) return;
    if (isGameOver(gameState)) return;

    // 現在のプレイヤーがCPU(p2)の場合
    if (gameState.currentPlayer === "p2") {
      const timeout = setTimeout(() => {
        const legalMoves = getValidMoves(gameState, "p2");
        if (legalMoves.length > 0) {
          // ランダムに手を選択
          const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          const newGameState = applyMove(gameState, randomMove);
          setGameState(newGameState);
          setSelectedHandIndex(null); // 安全のため選択をリセット
          playSE("select");
        }
      }, 1000); // 1秒間CPUが「考える」時間を演出する

      return () => clearTimeout(timeout);
    }
  }, [gameState, appScreen, playSE]);

  if (!gameState) {
    return <div className={styles.loadingContainer}>LOADING...</div>;
  }

  const gameOver = isGameOver(gameState);
  const winner = getWinner(gameState);

  const legalMoves = gameOver ? [] : getValidMoves(gameState, gameState.currentPlayer);

  // 選択中の手札カードに対する合法な配置ポジションのセットを計算
  const validPositionsForSelectedCount = new Set(
    selectedHandIndex !== null
      ? legalMoves.filter(m => m.handIndex === selectedHandIndex).map(m => m.position)
      : []
  );

  const handleHandClick = (player: Player, index: number) => {
    if (gameOver) return;
    if (player !== gameState.currentPlayer) return;

    if (selectedHandIndex === index) {
      setSelectedHandIndex(null); // 選択解除
    } else {
      setSelectedHandIndex(index);
      playSE("click");
    }
  };

  const handleCellClick = (position: number) => {
    if (gameOver) return;
    if (selectedHandIndex === null) return;
    if (!validPositionsForSelectedCount.has(position)) return;

    // 手を適用してステートを更新
    const newGameState = applyMove(gameState, { handIndex: selectedHandIndex, position });
    setGameState(newGameState);
    setSelectedHandIndex(null); // 選択状態をリセット
    playSE("select");
  };

  const handleRestart = () => {
    setGameState(createInitialState());
    setSelectedHandIndex(null);
  };

  if (appScreen === "title") {
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

          <button 
             className={styles.startButton} 
             onClick={() => {
                playSE("click");
                startBGM();
                setAppScreen("play");
             }}
          >
            GAME START
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Main Board Area */}
      <div className={styles.mainBoardArea}>

        {/* Game Over Overlay */}
        {gameOver && (
          <div className={styles.gameOverOverlay}>
            {winner === "p1" ? (
              <h2 className={`${styles.gameOverTitle} ${styles.p1Win}`}>You Win!</h2>
            ) : (
              <h2 className={`${styles.gameOverTitle} ${styles.p2Win}`}>You Lose...</h2>
            )}
            <button
              onClick={handleRestart}
              className={styles.restartButton}
            >
              もう一度遊ぶ
            </button>
          </div>
        )}

        {/* The 9 Cells Board */}
        <div className={styles.board}>
          {gameState.board.map((cell, idx) => {
            const isSelectable = validPositionsForSelectedCount.has(idx);
            return (
              <BoardCell
                key={idx}
                cell={cell}
                isSelectable={isSelectable}
                onClick={() => handleCellClick(idx)}
              />
            )
          })}
        </div>


      </div>

      {/* Player 1 Area (Bottom) */}
      <PlayerArea
        player="p1"
        hands={gameState.p1Hands}
        currentPlayer={gameState.currentPlayer}
        selectedHandIndex={gameState.currentPlayer === "p1" ? selectedHandIndex : null}
        onHandClick={(idx) => handleHandClick("p1", idx)}
        gameOver={gameOver}
        gameState={gameState}
        validPositionsForSelectedCount={validPositionsForSelectedCount}
      />
    </div>
  );
}

// ----------------------
// Sub Components
// ----------------------

interface BoardCellProps {
  cell: Cell;
  isSelectable: boolean;
  onClick: () => void;
}

function BoardCell({ cell, isSelectable, onClick }: BoardCellProps) {
  let content = null;
  let cellStyle = styles.cellEmpty;

  const durabilityLevel = Math.max(0, Math.min(3, cell.durability));
  const pottyImage = `/potty${durabilityLevel}.png`;

  if (cell.type === "unit") {
    const isP1 = cell.unit.owner === "p1";
    cellStyle = isP1 ? styles.cellUnitP1 : styles.cellUnitP2;

    content = (
      <div className={styles.cellUnitContent}>
        <img src={CARD_ICONS[cell.unit.type]} alt={cell.unit.type} className={styles.cellUnitIcon} />

        {/* TTL Badge (寿命表示) */}
        <div className={`${styles.ttlBadgeBase} ${isP1 ? styles.ttlBadgeP1 : styles.ttlBadgeP2}`}>
          {cell.unit.ttl}
        </div>
      </div>
    );
  } else if (cell.type === "empty") {
    cellStyle = styles.cellEmpty;
  }

  const selectionStyle = isSelectable ? styles.cellSelectable : styles.cellNotSelectable;

  return (
    <div
      onClick={isSelectable ? onClick : undefined}
      className={`${styles.cellBase} ${cellStyle} ${selectionStyle}`}
    >
      <img src={pottyImage} alt={`potty-${durabilityLevel}`} className={styles.pottyBackground} />

      {/* 水溜り (isBlocked) 状態 */}
      {cell.isBlocked && <div className={styles.puddleOverlay}></div>}

      {content}
    </div>
  );
}

interface PlayerAreaProps {
  player: Player;
  hands: CardType[];
  currentPlayer: Player;
  selectedHandIndex: number | null;
  onHandClick: (idx: number) => void;
  isNPC?: boolean;
  gameOver: boolean;
  gameState: GameState;
  validPositionsForSelectedCount: Set<number>;
}

function PlayerArea({ player, hands, currentPlayer, selectedHandIndex, onHandClick, isNPC = false, gameOver, gameState, validPositionsForSelectedCount }: PlayerAreaProps) {
  const isMyTurn = player === currentPlayer;
  const isP1 = player === "p1";

  const headerAlignStyle = isP1 ? styles.playerHeaderP1 : styles.playerHeaderP2;

  const nameActiveStyle = isP1 ? styles.playerNameP1Active : styles.playerNameP2Active;
  const nameStyle = isMyTurn ? nameActiveStyle : styles.playerNameInactive;

  const indicatorActiveStyle = isP1 ? styles.turnIndicatorP1Active : styles.turnIndicatorP2Active;
  const indicatorStyle = isMyTurn ? indicatorActiveStyle : styles.turnIndicatorInactive;

  return (
    <div className={styles.playerAreaBase}>

      {/* Player Header (Turn Indicator) */}
      <div className={headerAlignStyle}>
        <h3 className={`${styles.playerName} ${nameStyle}`}>
          <div className={`${gameState.currentPlayer === "p2" ? styles.npcThinking : ""}`}>
            {!gameOver && gameState.currentPlayer === "p2" && "CPU が考え中です..."}
            {!gameOver && gameState.currentPlayer === "p1" && selectedHandIndex === null && "自分のカードを選択してください"}
            {!gameOver && gameState.currentPlayer === "p1" && selectedHandIndex !== null && validPositionsForSelectedCount.size > 0 && "配置するマスを選んでください"}
            {!gameOver && gameState.currentPlayer === "p1" && selectedHandIndex !== null && validPositionsForSelectedCount.size === 0 && "このカードは配置できる場所がありません"}
          </div>
        </h3>

        {/* Glow Line indicator built with a div */}
        <div className={`${styles.turnIndicator} ${indicatorStyle}`} />
      </div>

      {/* Hand Cards */}
      <div className={styles.handsContainer}>
        {hands.map((card, idx) => {
          const isSelected = selectedHandIndex === idx;
          const isPlayableStr = isMyTurn; // Disable visually if not turn

          let cardStyle = "";
          if (isSelected) {
            cardStyle = isP1 ? styles.handCardSelectedP1 : styles.handCardSelectedP2;
          } else {
            cardStyle = isP1 ? styles.handCardNormalP1 : styles.handCardNormalP2;
          }

          const playabilityStyle = isPlayableStr ? styles.handCardPlayable : styles.handCardUnplayable;

          return (
            <div
              key={idx}
              onClick={() => onHandClick(idx)}
              className={`${styles.handCard} ${playabilityStyle} ${cardStyle}`}
            >
              <img src={CARD_ICONS[card]} alt={card} className={styles.handCardIcon} />

              {/* Selection indicator dot */}
              {isSelected && (
                <div className={`${styles.selectionDotBase} ${isP1 ? styles.selectionDotP1 : styles.selectionDotP2}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}
