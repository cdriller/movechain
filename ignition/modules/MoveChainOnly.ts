import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Redeploys ONLY the MoveChain contract against an already-deployed TripCredits
// and registers it via addPlatform. For production / main deploys only.
// Branch previews use MoveChainPreview.ts instead.
export default buildModule("MoveChainOnlyModule", (m) => {
  const admin1 = m.getParameter("admin1");
  const admin2 = m.getParameter("admin2");
  const admin3 = m.getParameter("admin3");
  const tripCreditsAddress = m.getParameter("tripCredits");

  const tripCredits = m.contractAt("TripCredits", tripCreditsAddress);
  const moveChain = m.contract("MoveChain", [admin1, admin2, admin3, tripCredits]);

  m.call(tripCredits, "addPlatform", [moveChain]);

  return { tripCredits, moveChain };
});
