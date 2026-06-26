import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deploys MoveChain against an existing TripCredits for branch previews.
// Does NOT call TripCredits.setPlatform — production keeps its platform pointer.
//
// Limitation: TripCredits mint/burn/getCredits require msg.sender == platform,
// so credit and trip flows on the preview MoveChain will revert until main
// deploys and calls setPlatform. Useful for testing MoveChain-only logic
// (admins, operators, ABI) without breaking production.
export default buildModule("MoveChainPreviewModule", (m) => {
  const admin1 = m.getParameter("admin1");
  const admin2 = m.getParameter("admin2");
  const admin3 = m.getParameter("admin3");
  const tripCreditsAddress = m.getParameter("tripCredits");

  const tripCredits = m.contractAt("TripCredits", tripCreditsAddress);
  const moveChain = m.contract("MoveChain", [admin1, admin2, admin3, tripCredits]);

  return { moveChain };
});
