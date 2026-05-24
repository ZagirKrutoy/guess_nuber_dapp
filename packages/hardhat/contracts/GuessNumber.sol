// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GuessNumber
 * @notice Мини-игра «Угадай число». Владелец задаёт секретное число (хеш),
 *         игроки пытаются угадать. Каждый адрес имеет ограниченное количество попыток.
 */
contract GuessNumber {
    // ────────── State ──────────
    address public owner;
    bytes32 private secretHash;       // keccak256(abi.encodePacked(number, salt))
    uint8   public  maxAttempts;      // максимальное число попыток на адрес
    bool    public  gameActive;       // игра открыта для угадывания
    address public  winner;           // адрес победителя (address(0) если нет)

    mapping(address => uint8)  public attemptsUsed;   // потрачено попыток
    mapping(address => bool)   public hasWon;         // победил ли адрес

    // ────────── Events ──────────
    event GameStarted(address indexed owner, uint8 maxAttempts);
    event GuessMade(address indexed player, uint256 guess, bool correct, uint8 attemptsLeft);
    event GameWon(address indexed winner);
    event GameReset(address indexed owner);

    // ────────── Modifiers ──────────
    modifier onlyOwner() {
        require(msg.sender == owner, "GuessNumber: caller is not owner");
        _;
    }

    modifier onlyActive() {
        require(gameActive, "GuessNumber: game is not active");
        _;
    }

    // ────────── Constructor ──────────
    /**
     * @param _secretHash  keccak256(abi.encodePacked(secretNumber, salt))
     * @param _maxAttempts максимальное число попыток для каждого игрока (1–10)
     */
    constructor(bytes32 _secretHash, uint8 _maxAttempts) {
        require(_maxAttempts >= 1 && _maxAttempts <= 10, "GuessNumber: attempts must be 1-10");
        owner       = msg.sender;
        secretHash  = _secretHash;
        maxAttempts = _maxAttempts;
        gameActive  = true;

        emit GameStarted(msg.sender, _maxAttempts);
    }

    // ────────── Write Functions ──────────

    /**
     * @notice Сделать попытку угадать число.
     * @param guess    Предполагаемое число
     * @param salt     Соль, которую владелец раскрывает в открытой части игры
     *                 (передаётся игроком; в реальной схеме соль известна всем после reveal)
     */
    function makeGuess(uint256 guess, string calldata salt) external onlyActive {
        require(!hasWon[msg.sender], "GuessNumber: you already won");
        require(winner == address(0), "GuessNumber: game already has a winner");
        require(
            attemptsUsed[msg.sender] < maxAttempts,
            "GuessNumber: no attempts left"
        );

        attemptsUsed[msg.sender] += 1;
        uint8 attemptsLeft = maxAttempts - attemptsUsed[msg.sender];

        bool correct = keccak256(abi.encodePacked(guess, salt)) == secretHash;

        if (correct) {
            hasWon[msg.sender] = true;
            winner             = msg.sender;
            gameActive         = false;
            emit GameWon(msg.sender);
        }

        emit GuessMade(msg.sender, guess, correct, attemptsLeft);
    }

    /**
     * @notice Сбросить игру с новым секретом (только владелец).
     * @param _newSecretHash  Новый хеш секрета
     * @param _maxAttempts    Новое максимальное число попыток
     */
    function resetGame(bytes32 _newSecretHash, uint8 _maxAttempts) external onlyOwner {
        require(_maxAttempts >= 1 && _maxAttempts <= 10, "GuessNumber: attempts must be 1-10");
        secretHash  = _newSecretHash;
        maxAttempts = _maxAttempts;
        gameActive  = true;
        winner      = address(0);

        emit GameReset(msg.sender);
        emit GameStarted(msg.sender, _maxAttempts);
    }

    // ────────── View Functions ──────────

    /**
     * @notice Получить статус текущей игры.
     */
    function getGameStatus() external view returns (
        bool   active,
        address currentWinner,
        uint8  attempts
    ) {
        return (gameActive, winner, maxAttempts);
    }

    /**
     * @notice Получить количество оставшихся попыток для указанного адреса.
     */
    function getAttemptsLeft(address player) external view returns (uint8) {
        if (attemptsUsed[player] >= maxAttempts) return 0;
        return maxAttempts - attemptsUsed[player];
    }
}
