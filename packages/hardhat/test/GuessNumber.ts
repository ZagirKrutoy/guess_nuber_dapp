import { expect } from "chai";
import { network } from "hardhat";
import { solidityPackedKeccak256, ZeroAddress } from "ethers";

const { networkHelpers, ethers } = await network.create();

describe("GuessNumber", function () {
  const SECRET_NUMBER = 42n;
  const SALT = "scaffold2026";
  const MAX_ATTEMPTS = 3;

  async function deployFixture() {
    const [owner, player1, player2] = await ethers.getSigners();

    const secretHash = solidityPackedKeccak256(["uint256", "string"], [SECRET_NUMBER, SALT]);

    const GuessNumberFactory = await ethers.getContractFactory("GuessNumber");
    const guessNumber = await GuessNumberFactory.deploy(secretHash, MAX_ATTEMPTS);
    await guessNumber.waitForDeployment();

    return { guessNumber, owner, player1, player2 };
  }

  // ── Тест 1: write-функция makeGuess (неверное число) ──────────────────────
  it("should increment attemptsUsed on a wrong guess", async function () {
    const { guessNumber, player1 } = await networkHelpers.loadFixture(deployFixture);

    await guessNumber.connect(player1).makeGuess(99n, SALT);

    const gameId = await guessNumber.gameId();
    const used = await guessNumber.attemptsUsed(gameId, player1.address);
    expect(used).to.equal(1);

    const left = await guessNumber.getAttemptsLeft(player1.address);
    expect(left).to.equal(MAX_ATTEMPTS - 1);
  });

  // ── Тест 2: событие GuessMade эмитируется при вызове makeGuess ────────────
  it("should emit GuessMade event with correct fields", async function () {
    const { guessNumber, player1 } = await networkHelpers.loadFixture(deployFixture);

    await expect(guessNumber.connect(player1).makeGuess(7n, SALT))
      .to.emit(guessNumber, "GuessMade")
      .withArgs(player1.address, 7n, false, MAX_ATTEMPTS - 1);
  });

  // ── Тест 3: событие GameWon и победа при правильном числе ─────────────────
  it("should emit GameWon and set winner on correct guess", async function () {
    const { guessNumber, player1 } = await networkHelpers.loadFixture(deployFixture);

    await expect(guessNumber.connect(player1).makeGuess(SECRET_NUMBER, SALT))
      .to.emit(guessNumber, "GameWon")
      .withArgs(player1.address);

    expect(await guessNumber.winner()).to.equal(player1.address);
    expect(await guessNumber.gameActive()).to.equal(false);
  });

  // ── Тест 4: require — нельзя угадывать после исчерпания попыток ────────────
  it("should revert when player has no attempts left", async function () {
    const { guessNumber, player2 } = await networkHelpers.loadFixture(deployFixture);

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await guessNumber.connect(player2).makeGuess(999n, SALT);
    }

    await expect(guessNumber.connect(player2).makeGuess(1n, SALT)).to.be.revertedWith("GuessNumber: no attempts left");
  });

  // ── Тест 5: require — только owner может сбросить игру ────────────────────
  it("should revert resetGame when called by non-owner", async function () {
    const { guessNumber, player1 } = await networkHelpers.loadFixture(deployFixture);

    const newHash = solidityPackedKeccak256(["uint256", "string"], [7n, "newsalt"]);
    await expect(guessNumber.connect(player1).resetGame(newHash, 3)).to.be.revertedWith(
      "GuessNumber: caller is not owner",
    );
  });

  // ── Тест 6: resetGame — владелец успешно сбрасывает игру ──────────────────
  it("should allow owner to reset the game", async function () {
    const { guessNumber, owner, player1 } = await networkHelpers.loadFixture(deployFixture);

    await guessNumber.connect(player1).makeGuess(SECRET_NUMBER, SALT);
    expect(await guessNumber.gameActive()).to.equal(false);

    const newHash = solidityPackedKeccak256(["uint256", "string"], [7n, "newsalt"]);
    await expect(guessNumber.connect(owner).resetGame(newHash, 3))
      .to.emit(guessNumber, "GameReset")
      .withArgs(owner.address);

    expect(await guessNumber.gameActive()).to.equal(true);
    expect(await guessNumber.winner()).to.equal(ZeroAddress);
  });

  // ── Тест 7: после resetGame попытки игроков обнуляются ────────────────────
  it("should reset player attempts after resetGame", async function () {
    const { guessNumber, owner, player1 } = await networkHelpers.loadFixture(deployFixture);

    // player1 тратит все попытки
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await guessNumber.connect(player1).makeGuess(999n, SALT);
    }
    expect(await guessNumber.getAttemptsLeft(player1.address)).to.equal(0);

    // owner сбрасывает игру
    const newHash = solidityPackedKeccak256(["uint256", "string"], [7n, "newsalt"]);
    await guessNumber.connect(owner).resetGame(newHash, MAX_ATTEMPTS);

    // после сброса попытки player1 обнулены
    expect(await guessNumber.getAttemptsLeft(player1.address)).to.equal(MAX_ATTEMPTS);
  });
});
