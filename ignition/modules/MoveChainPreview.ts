import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Branch preview: deploy MoveChain against shared TripCredits and register
// it as an additional platform without removing existing production platforms.
export default buildModule("MoveChainPreviewModule", (m) => {
  const admin1 = m.getParameter("admin1");
  const admin2 = m.getParameter("admin2");
  const admin3 = m.getParameter("admin3");
  const tripCreditsAddress = m.getParameter("tripCredits");

  const tripCredits = m.contractAt("TripCredits", tripCreditsAddress);
  const moveChain = m.contract("MoveChain", [admin1, admin2, admin3, tripCredits]);

  m.call(tripCredits, "addPlatform", [moveChain]);

  return { tripCredits, moveChain };
});
