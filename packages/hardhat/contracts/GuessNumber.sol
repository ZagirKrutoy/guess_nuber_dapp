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
    uint256 public  gameId;           // номер текущего раунда, растёт при каждом resetGame

    // попытки и победы хранятся per-round: gameId => player => value
    mapping(uint256 => mapping(address => uint8)) public attemptsUsed;
    mapping(uint256 => mapping(address => bool))  public hasWon;

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
    constructor(bytes32 _secretHash, uint8 _maxAttempts) {
        require(_maxAttempts >= 1 && _maxAttempts <= 10, "GuessNumber: attempts must be 1-10");
        owner       = msg.sender;
        secretHash  = _secretHash;
        maxAttempts = _maxAttempts;
        gameActive  = true;
        gameId      = 0;

        emit GameStarted(msg.sender, _maxAttempts);
    }

    // ────────── Write Functions ──────────

    function makeGuess(uint256 guess, string calldata salt) external onlyActive {
        require(!hasWon[gameId][msg.sender], "GuessNumber: you already won");
        require(winner == address(0), "GuessNumber: game already has a winner");
        require(
            attemptsUsed[gameId][msg.sender] < maxAttempts,
            "GuessNumber: no attempts left"
        );

        attemptsUsed[gameId][msg.sender] += 1;
        uint8 attemptsLeft = maxAttempts - attemptsUsed[gameId][msg.sender];

        bool correct = keccak256(abi.encodePacked(guess, salt)) == secretHash;

        if (correct) {
            hasWon[gameId][msg.sender] = true;
            winner                     = msg.sender;
            gameActive                 = false;
            emit GameWon(msg.sender);
        }

        emit GuessMade(msg.sender, guess, correct, attemptsLeft);
    }

    function resetGame(bytes32 _newSecretHash, uint8 _maxAttempts) external onlyOwner {
        require(_maxAttempts >= 1 && _maxAttempts <= 10, "GuessNumber: attempts must be 1-10");
        secretHash  = _newSecretHash;
        maxAttempts = _maxAttempts;
        gameActive  = true;
        winner      = address(0);
        gameId     += 1;   // новый раунд — все счётчики попыток автоматически обнуляются

        emit GameReset(msg.sender);
        emit GameStarted(msg.sender, _maxAttempts);
    }

    // ────────── View Functions ──────────

    function getGameStatus() external view returns (
        bool    active,
        address currentWinner,
        uint8   attempts
    ) {
        return (gameActive, winner, maxAttempts);
    }

    function getAttemptsLeft(address player) external view returns (uint8) {
        if (attemptsUsed[gameId][player] >= maxAttempts) return 0;
        return maxAttempts - attemptsUsed[gameId][player];
    }
}
