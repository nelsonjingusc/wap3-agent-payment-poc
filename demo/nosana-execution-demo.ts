import { getExecutionLayer } from "../execution";

async function main() {
  const layer = getExecutionLayer("nosana");

  const receipt = await layer.submit({
    taskType: "market_similarity",
    inputs: { eventText: "Example event", marketUniverse: ["A", "B"] }
  });

  console.log("ExecutionReceipt:", receipt);

  const result = await layer.waitForCompletion(receipt.executionId);

  console.log("ExecutionResult:", result);

  // settlement hook (placeholder)
  if (result.status === "SUCCEEDED") {
    console.log("[settlement] would trigger escrow release here");
  } else {
    console.log("[settlement] would refund/handle failure here");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

