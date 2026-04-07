export type Player = "p1" | "p2";
export type CardType = "normal" | "brave" | "cleaner" | "block";

export interface Unit {
    type: CardType;
    owner: Player;
    ttl: number; // Time to live
}

export type Cell =
    | { type: "empty"; durability: number; isBlocked: boolean }
    | { type: "unit"; unit: Unit; durability: number; isBlocked: boolean };

export interface GameState {
    board: Cell[];
    currentPlayer: Player;
    p1Hands: CardType[];
    p2Hands: CardType[];
}

export interface Move {
    handIndex: number;
    position: number;
}

/**
 * 確率に基づいてカードを引く
 */
function drawCard(): CardType {
    const r = Math.random();
    if (r < 0.55) return "normal"; // 55%
    if (r < 0.70) return "brave";  // 15%
    if (r < 0.85) return "cleaner";  // 15%
    return "block";                // 15%
}

/**
 * 初期状態を生成する
 */
export function createInitialState(): GameState {
    const board: Cell[] = Array.from({ length: 9 }, () => ({ type: "empty", durability: 3, isBlocked: false }));
    return {
        board,
        currentPlayer: "p1",
        p1Hands: [drawCard(), drawCard(), drawCard()],
        p2Hands: [drawCard(), drawCard(), drawCard()],
    };
}

/**
 * 現在のプレイヤーが選択可能な合法手のリストを取得する
 */
export function getValidMoves(state: GameState, player: Player): Move[] {
    const validMoves: Move[] = [];
    const hands = player === "p1" ? state.p1Hands : state.p2Hands;

    for (let i = 0; i < hands.length; i++) {
        const card = hands[i];

        for (let pos = 0; pos < 9; pos++) {
            const cell = state.board[pos];

            // 共通: 壊れたトイレ (durability <= 0) にはcleanerしか置けない
            if (cell.durability <= 0 && card !== "cleaner") continue;

            // 共通: すでに埋まっているマス(ユニット)には絶対置けない
            if (cell.type === "unit") continue;

            // cleaner は blocked(水溜り)上にも置けるが、それ以外は isBlocked なら置けない
            if (card !== "cleaner" && cell.isBlocked) {
                continue;
            }

            // 隣接制約 (normal, block)
            if (card === "normal" || card === "block") {
                const leftOccupied = pos > 0 && state.board[pos - 1].type === "unit";
                const rightOccupied = pos < 8 && state.board[pos + 1].type === "unit";

                // 左右の隣に「ユニット」がある場合は配置不可
                if (leftOccupied || rightOccupied) {
                    continue;
                }
            }

            validMoves.push({ handIndex: i, position: pos });
        }
    }

    return validMoves;
}

/**
 * 現在のステートに対して指定された手を適用し、新しいステートを返す
 */
export function applyMove(state: GameState, move: Move): GameState {
    const hand = state.currentPlayer === "p1" ? [...state.p1Hands] : [...state.p2Hands];
    const cardPlayed = hand[move.handIndex];

    // 1. 手札からカードを捨てる
    hand.splice(move.handIndex, 1);

    // 2~3. 初期寿命を設定して駒を配置 (cleanerは5, blockは3, normalとbraveは4)
    const initialTtl = cardPlayed === "cleaner" ? 5 : cardPlayed === "block" ? 3 : 4;

    const preBoard = [...state.board];
    const targetCell = preBoard[move.position];

    preBoard[move.position] = {
        type: "unit",
        durability: targetCell.durability,
        isBlocked: targetCell.isBlocked,
        unit: {
            type: cardPlayed,
            owner: state.currentPlayer,
            ttl: initialTtl,
        },
    };

    // 5. カードを1枚ドロー
    hand.push(drawCard());

    // 6. TTL（寿命）を減少させる & 消滅時の処理
    const finalBoard = preBoard.map((cell): Cell => {
        if (cell.type === "unit") {
            const nextTtl = cell.unit.ttl - 1;
            if (nextTtl <= 0) {
                // 消滅時の処理
                const unitType = cell.unit.type;
                let nextDurability = cell.durability;
                let nextIsBlocked = cell.isBlocked;

                // 消滅時のペナルティ設定
                if (unitType === "block") {
                    // Blockカードが消滅した場合は、耐久地はそのままで `isBlocked` を付与(水溜り)
                    nextIsBlocked = true;
                } else if (unitType === "cleaner") {
                    // Cleaner消滅時は `isBlocked` (水溜り) を解除する。そして通常の耐久減少を受ける
                    nextIsBlocked = false;
                    nextDurability = 3;
                } else {
                    // 通常ユニットなどは耐久値-1
                    nextDurability -= 1;
                }

                // 念のため耐久値は0未満にならないようガード
                nextDurability = Math.max(0, nextDurability);

                return { type: "empty", durability: nextDurability, isBlocked: nextIsBlocked };
            }
            return { type: "unit", durability: cell.durability, isBlocked: cell.isBlocked, unit: { ...cell.unit, ttl: nextTtl } };
        }
        return cell;
    });

    // 7. ターン交代
    const nextPlayer = state.currentPlayer === "p1" ? "p2" : "p1";

    return {
        board: finalBoard,
        currentPlayer: nextPlayer,
        p1Hands: state.currentPlayer === "p1" ? hand : [...state.p1Hands],
        p2Hands: state.currentPlayer === "p2" ? hand : [...state.p2Hands],
    };
}

export function isGameOver(state: GameState): boolean {
    return getValidMoves(state, state.currentPlayer).length === 0;
}

export function getWinner(state: GameState): Player | null {
    if (!isGameOver(state)) return null;
    return state.currentPlayer === "p1" ? "p2" : "p1";
}

export function simulateRandomGame(): number {
    let state = createInitialState();
    let turns = 0;

    while (!isGameOver(state)) {
        const validMoves = getValidMoves(state, state.currentPlayer);
        if (validMoves.length === 0) break;

        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        state = applyMove(state, randomMove);
        turns++;

        if (turns > 1000) break;
    }

    return turns;
}
