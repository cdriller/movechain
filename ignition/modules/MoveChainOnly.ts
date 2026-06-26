import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Redeploys ONLY the MoveChain contract against an already-deployed TripCredits.
// The existing TripCredits (and its ERC-1155 credit balances) is preserved; we
// just point its `platform` at the freshly deployed MoveChain via setPlatform.
//
// NOTE: setPlatform is onlyOwner, so this must be run with the same account that
// originally deployed TripCredits.
export default buildModule("MoveChainOnlyModule", (m) => {
  const admin1 = m.getParameter("admin1");
  const admin2 = m.getParameter("admin2");
  const admin3 = m.getParameter("admin3");
  const tripCreditsAddress = m.getParameter("tripCredits");

  const tripCredits = m.contractAt("TripCredits", tripCreditsAddress);
  const moveChain = m.contract("MoveChain", [admin1, admin2, admin3, tripCredits]);

  m.call(tripCredits, "setPlatform", [moveChain]);

  return { tripCredits, moveChain };
});
