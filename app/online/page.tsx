"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GameState,
  Player,
  CardType,
  applyMove,
  getValidMoves,
  isGameOver,
  getWinner,
  Cell
} from "../gameState";
import styles from '../styles.module.css';
import { useAudio } from '../hooks/useAudio';
import { useFirebaseMatch } from '../hooks/useFirebaseMatch';

const CARD_ICONS: Record<CardType, string> = {
  normal: "/normal.png",
  brave: "/brave.png",
  cleaner: "/cleaner.png",
  block: "/block.png"
};

export default function OnlineGame() {
  const router = useRouter();
  const { playSE } = useAudio();
  const { uid, playerRole, matchStatus, remoteGameState, syncGameState, restartMatch } = useFirebaseMatch();
  
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);

  if (matchStatus === "searching" || matchStatus === "waiting") {
    return (
      <div className={styles.loadingContainer}>
        {matchStatus === "searching" ? "マッチングを検索中..." : "対戦相手を待っています..."}
      </div>
    );
  }

  if (!remoteGameState || !playerRole) {
    return <div className={styles.loadingContainer}>LOADING...</div>;
  }

  const gameState = remoteGameState;
  const gameOver = isGameOver(gameState);
  const winner = getWinner(gameState);

  const isMyTurn = gameState.currentPlayer === playerRole;
  const legalMoves = (gameOver || !isMyTurn) ? [] : getValidMoves(gameState, playerRole);

  const validPositionsForSelectedCount = new Set(
    selectedHandIndex !== null
      ? legalMoves.filter(m => m.handIndex === selectedHandIndex).map(m => m.position)
      : []
  );

  const handleHandClick = (player: Player, index: number) => {
    if (gameOver) return;
    if (player !== playerRole) return; // 自分の手札しか触れない
    if (!isMyTurn) return; // 自分のターンのみ

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
    syncGameState(newGameState);
    setSelectedHandIndex(null);
    playSE("select");
  };

  const handleRestart = () => {
    if (playerRole === "p1") {
       restartMatch();
       setSelectedHandIndex(null);
    }
  };

  const opponentRole = playerRole === "p1" ? "p2" : "p1";
  const opponentHands = opponentRole === "p1" ? gameState.p1Hands : gameState.p2Hands;
  const myHands = playerRole === "p1" ? gameState.p1Hands : gameState.p2Hands;

  return (
    <div className={styles.container}>
      <button 
        style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 100, padding: "0.5rem 1rem", background: "#333", color: "white", borderRadius: "5px", border: "none", cursor: "pointer"}} 
        onClick={() => router.push("/")}>
        ← TOP
      </button>

      {/* Opponent Area (Top) */}
      <PlayerArea
        player={opponentRole}
        hands={opponentHands}
        currentPlayer={gameState.currentPlayer}
        selectedHandIndex={null}
        onHandClick={() => {}}
        gameOver={gameOver}
        myRole={playerRole}
      />

      <div className={styles.mainBoardArea}>
        {gameOver && (
          <div className={styles.gameOverOverlay}>
            {winner === playerRole ? (
              <h2 className={`${styles.gameOverTitle} ${styles.p1Win}`}>You Win!</h2>
            ) : (
              <h2 className={`${styles.gameOverTitle} ${styles.p2Win}`}>You Lose...</h2>
            )}
            {playerRole === "p1" ? (
              <button onClick={handleRestart} className={styles.restartButton}>もう一度遊ぶ</button>
            ) : (
              <p style={{marginTop: "20px"}}>ホストが再戦を選択するのを待っています...</p>
            )}
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

      {/* My Area (Bottom) */}
      <PlayerArea
        player={playerRole}
        hands={myHands}
        currentPlayer={gameState.currentPlayer}
        selectedHandIndex={selectedHandIndex}
        onHandClick={(idx) => handleHandClick(playerRole, idx)}
        gameOver={gameOver}
        myRole={playerRole}
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
  gameOver: boolean;
  myRole: string;
}

function PlayerArea({ player, hands, currentPlayer, selectedHandIndex, onHandClick, gameOver, myRole }: PlayerAreaProps) {
  const isMyTurn = player === currentPlayer;
  const isP1 = player === "p1";
  const isLocalPlayer = player === myRole;

  const headerAlignStyle = isP1 ? styles.playerHeaderP1 : styles.playerHeaderP2;
  const nameActiveStyle = isP1 ? styles.playerNameP1Active : styles.playerNameP2Active;
  const nameStyle = isMyTurn ? nameActiveStyle : styles.playerNameInactive;
  const indicatorActiveStyle = isP1 ? styles.turnIndicatorP1Active : styles.turnIndicatorP2Active;
  const indicatorStyle = isMyTurn ? indicatorActiveStyle : styles.turnIndicatorInactive;

  return (
    <div className={styles.playerAreaBase}>
      <div className={headerAlignStyle}>
        <h3 className={`${styles.playerName} ${nameStyle}`}>
          <div className={`${!isLocalPlayer ? styles.npcThinking : ""}`}>
            {!gameOver && isMyTurn && !isLocalPlayer && "対戦相手が考え中です..."}
            {!gameOver && isMyTurn && isLocalPlayer && selectedHandIndex === null && "自分のカードを選択してください"}
            {!gameOver && isMyTurn && isLocalPlayer && selectedHandIndex !== null && "配置するマスを選んでください"}
          </div>
        </h3>
        <div className={`${styles.turnIndicator} ${indicatorStyle}`} />
      </div>

      <div className={styles.handsContainer}>
        {hands.map((card, idx) => {
          const isSelected = selectedHandIndex === idx;
          const isPlayableStr = isMyTurn && isLocalPlayer; 
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
