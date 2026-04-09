"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "../gameState";
import styles from '../styles.module.css';
import { useAudio } from '../hooks/useAudio';

const CARD_ICONS: Record<CardType, string> = {
  normal: "/normal.png",
  brave: "/brave.png",
  cleaner: "/cleaner.png",
  block: "/block.png"
};

export default function OfflineGame() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);

  const { playSE } = useAudio();

  React.useEffect(() => {
    setGameState(createInitialState());
  }, []);

  // --- CPU (NPC) Logic ---
  React.useEffect(() => {
    if (!gameState) return;
    if (isGameOver(gameState)) return;

    if (gameState.currentPlayer === "p2") {
      const timeout = setTimeout(() => {
        const legalMoves = getValidMoves(gameState, "p2");
        if (legalMoves.length > 0) {
          const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          const newGameState = applyMove(gameState, randomMove);
          setGameState(newGameState);
          setSelectedHandIndex(null);
          playSE("select");
        }
      }, 1000); 

      return () => clearTimeout(timeout);
    }
  }, [gameState, playSE]);

  if (!gameState) {
    return <div className={styles.loadingContainer}>LOADING...</div>;
  }

  const gameOver = isGameOver(gameState);
  const winner = getWinner(gameState);
  const legalMoves = gameOver ? [] : getValidMoves(gameState, gameState.currentPlayer);

  const validPositionsForSelectedCount = new Set(
    selectedHandIndex !== null
      ? legalMoves.filter(m => m.handIndex === selectedHandIndex).map(m => m.position)
      : []
  );

  const handleHandClick = (player: Player, index: number) => {
    if (gameOver) return;
    if (player !== gameState.currentPlayer) return;

    if (selectedHandIndex === index) {
      setSelectedHandIndex(null);
    } else {
      setSelectedHandIndex(index);
      playSE("click");
    }
  };

  const handleCellClick = (position: number) => {
    if (gameOver) return;
    if (selectedHandIndex === null) return;
    if (!validPositionsForSelectedCount.has(position)) return;

    const newGameState = applyMove(gameState, { handIndex: selectedHandIndex, position });
    setGameState(newGameState);
    setSelectedHandIndex(null);
    playSE("select");
  };

  const handleRestart = () => {
    setGameState(createInitialState());
    setSelectedHandIndex(null);
  };

  return (
    <div className={styles.container}>
      {/* 戻るボタン */}
      <button 
        style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 100, padding: "0.5rem 1rem", background: "#333", color: "white", borderRadius: "5px", border: "none", cursor: "pointer"}} 
        onClick={() => router.push("/")}>
        ← TOP
      </button>

      <div className={styles.mainBoardArea}>
        {gameOver && (
          <div className={styles.gameOverOverlay}>
            {winner === "p1" ? (
              <h2 className={`${styles.gameOverTitle} ${styles.p1Win}`}>You Win!</h2>
            ) : (
              <h2 className={`${styles.gameOverTitle} ${styles.p2Win}`}>You Lose...</h2>
            )}
            <button onClick={handleRestart} className={styles.restartButton}>
              もう一度遊ぶ
            </button>
          </div>
        )}

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
      <div className={headerAlignStyle}>
        <h3 className={`${styles.playerName} ${nameStyle}`}>
          <div className={`${gameState.currentPlayer === "p2" ? styles.npcThinking : ""}`}>
            {!gameOver && gameState.currentPlayer === "p2" && "CPU が考え中です..."}
            {!gameOver && gameState.currentPlayer === "p1" && selectedHandIndex === null && "自分のカードを選択してください"}
            {!gameOver && gameState.currentPlayer === "p1" && selectedHandIndex !== null && validPositionsForSelectedCount.size > 0 && "配置するマスを選んでください"}
            {!gameOver && gameState.currentPlayer === "p1" && selectedHandIndex !== null && validPositionsForSelectedCount.size === 0 && "このカードは配置できる場所がありません"}
          </div>
        </h3>
        <div className={`${styles.turnIndicator} ${indicatorStyle}`} />
      </div>

      <div className={styles.handsContainer}>
        {hands.map((card, idx) => {
          const isSelected = selectedHandIndex === idx;
          const isPlayableStr = isMyTurn; 
          const cardStyle = isSelected ? (isP1 ? styles.handCardSelectedP1 : styles.handCardSelectedP2) : (isP1 ? styles.handCardNormalP1 : styles.handCardNormalP2);
          const playabilityStyle = isPlayableStr ? styles.handCardPlayable : styles.handCardUnplayable;

          return (
            <div
              key={idx}
              onClick={() => onHandClick(idx)}
              className={`${styles.handCard} ${playabilityStyle} ${cardStyle}`}
            >
              <img src={CARD_ICONS[card]} alt={card} className={styles.handCardIcon} />
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
