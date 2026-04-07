import React from "react";
import { simulateRandomGame } from "../gameState";

export default function TestPage() {
  // 20回分のシミュレーションを実行
  const results: string[] = [];
  for (let i = 0; i < 20; i++) {
    const turns = simulateRandomGame();
    results.push(`ゲーム ${i + 1}: ${turns} ターンで終了`);
  }

  return (
    <div className="p-8 font-sans bg-zinc-950 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">ランダムプレイ シミュレーション結果 (20回)</h1>
      <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl border border-zinc-800">
        <ul className="space-y-3">
          {results.map((result, index) => (
            <li
              key={index}
              className="text-lg text-zinc-300 border-b border-zinc-800 pb-2 last:border-0"
            >
              {result}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
