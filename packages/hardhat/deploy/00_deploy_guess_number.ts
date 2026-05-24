import { solidityPackedKeccak256 } from "ethers";
import { deployScript } from "../rocketh/deploy.js";
import * as artifacts from "../generated/artifacts/index.js";

const secretNumber = 42n;
const salt = "scaffold2026";
const maxAttempts = 5;

export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    const secretHash = solidityPackedKeccak256(["uint256", "string"], [secretNumber, salt]) as `0x${string}`;

    await env.deploy("GuessNumber", {
      account: deployer,
      artifact: artifacts.GuessNumber,
      args: [secretHash, maxAttempts],
    });

    console.log(`\n✅ GuessNumber deployed!`);
    console.log(`   Secret number : 42`);
    console.log(`   Salt          : ${salt}`);
    console.log(`   Secret hash   : ${secretHash}`);
    console.log(`   Max attempts  : ${maxAttempts}`);
  },
  {
    tags: ["GuessNumber"],
  },
);
