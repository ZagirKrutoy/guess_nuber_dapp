"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function GuessPage() {
  const { address, isConnected } = useAccount();
  const [guessInput, setGuessInput] = useState("");
  const SALT = "scaffold2026";

  const { data: gameStatus, refetch: refetchStatus } = useScaffoldReadContract({
    contractName: "GuessNumber",
    functionName: "getGameStatus",
  });

  const { data: attemptsLeft, refetch: refetchAttempts } = useScaffoldReadContract({
    contractName: "GuessNumber",
    functionName: "getAttemptsLeft",
    args: [address],
  });

  const { data: maxAttempts } = useScaffoldReadContract({
    contractName: "GuessNumber",
    functionName: "maxAttempts",
  });

  const { writeContractAsync: makeGuess, isPending } = useScaffoldWriteContract({ contractName: "GuessNumber" });

  const handleGuess = async () => {
    const num = parseInt(guessInput, 10);
    if (isNaN(num) || num < 0) {
      notification.error("Введите корректное целое число!");
      return;
    }
    try {
      await makeGuess({ functionName: "makeGuess", args: [BigInt(num), SALT] });
      notification.success("Транзакция отправлена!");
      setGuessInput("");
      setTimeout(() => {
        refetchStatus();
        refetchAttempts();
      }, 2000);
    } catch (e: any) {
      notification.error(e?.message ?? "Ошибка транзакции");
    }
  };

  const active = gameStatus?.[0];
  const winnerAddr = gameStatus?.[1];
  const isWinner = winnerAddr && winnerAddr !== "0x0000000000000000000000000000000000000000";
  const myAttempts = attemptsLeft !== undefined ? Number(attemptsLeft) : null;
  const maxAtt = maxAttempts ? Number(maxAttempts) : 5;
  const usedAtt = myAttempts !== null ? maxAtt - myAttempts : null;
  const noAttempts = myAttempts === 0;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--game-bg)" }}
    >
      {/* Заголовок */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight mb-2" style={{ color: "var(--game-text)" }}>
          🎲 Угадай число
        </h1>
        <p className="text-lg" style={{ color: "var(--game-text-muted)" }}>
          Децентрализованная мини-игра на блокчейне
        </p>
      </div>

      {/* Карточка игры */}
      <div
        className="w-full max-w-md backdrop-blur-md rounded-2xl p-8 shadow-2xl"
        style={{
          background: "var(--game-card-bg)",
          border: "1px solid var(--game-card-border)",
        }}
      >
        {/* Статус игры */}
        <div className="mb-6 text-center">
          {isWinner ? (
            <div className="bg-yellow-400/20 rounded-xl p-4 border border-yellow-400">
              <p className="text-yellow-500 font-bold text-lg">🏆 Победитель найден!</p>
              <p className="text-xs mt-1 break-all" style={{ color: "var(--game-text)" }}>
                {winnerAddr}
              </p>
              {winnerAddr?.toLowerCase() === address?.toLowerCase() && (
                <p className="text-green-500 font-bold mt-2">🎉 Это вы!</p>
              )}
            </div>
          ) : active ? (
            <div className="bg-green-500/20 rounded-xl p-4 border border-green-500">
              <p className="text-green-600 dark:text-green-300 font-semibold">✅ Игра активна — угадывайте!</p>
            </div>
          ) : (
            <div className="bg-base-300 rounded-xl p-4 border border-base-content/20">
              <p className="text-base-content/60">⏸ Игра завершена</p>
            </div>
          )}
        </div>

        {/* Попытки */}
        {isConnected && myAttempts !== null && (
          <div className="mb-6">
            <p className="text-sm mb-2" style={{ color: "var(--game-text-muted)" }}>
              Ваши попытки
            </p>
            <div className="flex gap-2">
              {Array.from({ length: maxAtt }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-full ${i < (usedAtt ?? 0) ? "bg-red-500" : "bg-purple-400"}`}
                />
              ))}
            </div>
            <p className="text-xs mt-1 text-right" style={{ color: "var(--game-text)" }}>
              Осталось:{" "}
              <span className="font-bold" style={{ color: "var(--game-accent)" }}>
                {myAttempts}
              </span>{" "}
              / {maxAtt}
            </p>
          </div>
        )}

        {/* Форма угадывания */}
        {!isConnected ? (
          <div className="text-center py-4" style={{ color: "var(--game-text-muted)" }}>
            🔌 Подключите кошелёк MetaMask для участия
          </div>
        ) : active && !isWinner && !noAttempts ? (
          <div className="flex flex-col gap-4">
            <input
              type="number"
              min={0}
              value={guessInput}
              onChange={e => setGuessInput(e.target.value)}
              placeholder="Введите число (0–100)"
              className="w-full px-4 py-3 rounded-xl text-center text-xl focus:outline-none transition"
              style={{
                background: "var(--game-input-bg)",
                border: "1px solid var(--game-input-border)",
                color: "var(--game-text)",
              }}
            />
            <button
              onClick={handleGuess}
              disabled={isPending || !guessInput}
              className="w-full py-3 rounded-xl font-bold text-lg transition disabled:opacity-40 text-white shadow-lg"
              style={{ background: "var(--game-accent)" }}
            >
              {isPending ? "⏳ Отправка..." : "🎯 Угадать!"}
            </button>
          </div>
        ) : noAttempts ? (
          <div className="text-center text-red-500 py-4 font-semibold">❌ У вас закончились попытки</div>
        ) : null}

        {/* Подсказка */}
        {active && !isWinner && (
          <p className="text-center text-xs mt-6" style={{ color: "var(--game-text-muted)" }}>
            💡 Подсказка: число от 1 до 100
          </p>
        )}
      </div>

      {/* Инфо-блок */}
      <div
        className="mt-8 w-full max-w-md rounded-xl p-4"
        style={{
          background: "var(--game-card-bg)",
          border: "1px solid var(--game-card-border)",
        }}
      >
        <h3 className="font-semibold mb-2 text-sm" style={{ color: "var(--game-accent)" }}>
          📖 Как играть
        </h3>
        <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: "var(--game-text-muted)" }}>
          <li>Введите число и нажмите «Угадать»</li>
          <li>Каждая попытка — это транзакция в блокчейне</li>
          <li>У каждого игрока {maxAtt} попыток</li>
          <li>Первый угадавший становится победителем</li>
        </ul>
      </div>
    </main>
  );
}
