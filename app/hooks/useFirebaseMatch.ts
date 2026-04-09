import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { 
  collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, serverTimestamp 
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { GameState, createInitialState } from "../gameState";

export function useFirebaseMatch() {
  const [uid, setUid] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<"p1" | "p2" | null>(null);
  const [remoteGameState, setRemoteGameState] = useState<GameState | null>(null);
  const [matchStatus, setMatchStatus] = useState<"searching" | "waiting" | "playing">("searching");
  const [playersInfo, setPlayersInfo] = useState({ p1: "Player 1", p2: "Player 2" });

  // 1. 匿名認証
  useEffect(() => {
    signInAnonymously(auth).then((cred) => {
      setUid(cred.user.uid);
    }).catch((e) => {
      console.error("Auth failed:", e);
    });
  }, []);

  // 2. マッチング処理
  useEffect(() => {
    if (!uid) return;
    if (roomId) return; // 既に部屋がある場合

    let isMounted = true;

    const findMatch = async () => {
      if (!isMounted) return;
      setMatchStatus("searching");

      const username = localStorage.getItem("osicko_username") || "Guest";

      const roomsRef = collection(db, "rooms");
      const q = query(roomsRef, where("status", "==", "waiting"));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // 空き部屋が見つかった -> p2として参加
        const roomDoc = snapshot.docs[0];
        setRoomId(roomDoc.id);
        setPlayerRole("p2");

        await updateDoc(doc(db, "rooms", roomDoc.id), {
          status: "playing",
          player2Id: uid,
          player2Name: username,
          updatedAt: serverTimestamp()
        });
        setMatchStatus("playing");
      } else {
        // 見つからない -> p1として部屋を作る
        setPlayerRole("p1");
        const docRef = await addDoc(roomsRef, {
          status: "waiting",
          player1Id: uid,
          player1Name: username,
          player2Id: null,
          player2Name: null,
          gameStateStr: JSON.stringify(createInitialState()),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setRoomId(docRef.id);
        setMatchStatus("waiting");
      }
    };

    findMatch();
    return () => { isMounted = false; };
  }, [uid, roomId]);

  // 3. 部屋のリアルタイム同期
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, "rooms", roomId), (ds) => {
      if (ds.exists()) {
        const data = ds.data();
        if (data.status === "playing") {
             setMatchStatus("playing");
        }
        if (data.status === "waiting") {
             setMatchStatus("waiting");
        }

        setPlayersInfo({
          p1: data.player1Name || "Player 1",
          p2: data.player2Name || "Player 2"
        });

        if (data.gameStateStr) {
          try {
            const state = JSON.parse(data.gameStateStr) as GameState;
            setRemoteGameState(state);
          } catch (e) {
            console.error("Parse state error", e);
          }
        }
      }
    });
    return () => unsub();
  }, [roomId]);

  // ステートを更新する関数
  const syncGameState = async (newState: GameState) => {
    if (!roomId) return;
    await updateDoc(doc(db, "rooms", roomId), {
      gameStateStr: JSON.stringify(newState),
      updatedAt: serverTimestamp()
    });
  };

  const restartMatch = async () => {
    if (!roomId) return;
    await updateDoc(doc(db, "rooms", roomId), {
      gameStateStr: JSON.stringify(createInitialState()),
      updatedAt: serverTimestamp()
    });
  }

  return { uid, roomId, playerRole, matchStatus, remoteGameState, syncGameState, restartMatch, playersInfo };
}
