"use client";

import { useState } from "react";
import { encodePacked, keccak256 } from "viem";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function AdminPage() {
  const [newNumber, setNewNumber] = useState("");
  const [newSalt, setNewSalt] = useState("");
  const [maxAtt, setMaxAtt] = useState("5");

  const { writeContractAsync: resetGame, isPending } = useScaffoldWriteContract({ contractName: "GuessNumber" });

  const handleReset = async () => {
    const num = parseInt(newNumber, 10);
    if (isNaN(num) || !newSalt) {
      notification.error("Заполните все поля");
      return;
    }
    const hash = keccak256(encodePacked(["uint256", "string"], [BigInt(num), newSalt]));
    try {
      await resetGame({
        functionName: "resetGame",
        args: [hash as `0x${string}`, parseInt(maxAtt)],
      });
      notification.success("Игра сброшена!");
    } catch (e: any) {
      notification.error(e?.message ?? "Ошибка");
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl focus:outline-none transition";

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--game-bg)" }}
    >
      <div
        className="w-full max-w-md backdrop-blur rounded-2xl p-8 shadow-2xl"
        style={{
          background: "var(--game-card-bg)",
          border: "1px solid var(--game-card-border)",
        }}
      >
        <h1 className="text-3xl font-bold mb-6 text-center" style={{ color: "var(--game-text)" }}>
          🔐 Панель администратора
        </h1>
        <p className="text-sm mb-6 text-center" style={{ color: "var(--game-text-muted)" }}>
          Только владелец контракта может сбросить игру
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="number"
            placeholder="Новое секретное число"
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            className={inputClass}
            style={{
              background: "var(--game-input-bg)",
              border: "1px solid var(--game-input-border)",
              color: "var(--game-text)",
            }}
          />
          <input
            type="text"
            placeholder="Соль (любая строка)"
            value={newSalt}
            onChange={e => setNewSalt(e.target.value)}
            className={inputClass}
            style={{
              background: "var(--game-input-bg)",
              border: "1px solid var(--game-input-border)",
              color: "var(--game-text)",
            }}
          />
          <input
            type="number"
            min={1}
            max={10}
            placeholder="Макс. попыток (1-10)"
            value={maxAtt}
            onChange={e => setMaxAtt(e.target.value)}
            className={inputClass}
            style={{
              background: "var(--game-input-bg)",
              border: "1px solid var(--game-input-border)",
              color: "var(--game-text)",
            }}
          />
          <button
            onClick={handleReset}
            disabled={isPending}
            className="w-full py-3 rounded-xl font-bold text-lg transition disabled:opacity-40 text-white shadow-lg"
            style={{ background: "var(--game-accent)" }}
          >
            {isPending ? "⏳ Отправка..." : "🔄 Сбросить игру"}
          </button>
        </div>

        <div
          className="mt-6 rounded-xl p-4"
          style={{
            background: "rgba(234, 179, 8, 0.1)",
            border: "1px solid rgba(234, 179, 8, 0.3)",
          }}
        >
          <p className="text-yellow-600 dark:text-yellow-300 text-xs">
            ⚠️ После сброса игры сообщите игрокам новую соль, чтобы они могли проверить корректность хеша. Само
            секретное число остаётся зашифрованным до конца игры.
          </p>
        </div>
      </div>
    </main>
  );
}
