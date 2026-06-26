import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MoveChainModule", (m) => {
  const admin1 = m.getParameter("admin1");
  const admin2 = m.getParameter("admin2");
  const admin3 = m.getParameter("admin3");

  const tripCredits = m.contract("TripCredits");
  const moveChain = m.contract("MoveChain", [admin1, admin2, admin3, tripCredits]);

  m.call(tripCredits, "setPlatform", [moveChain]);

  return { tripCredits, moveChain };
});
