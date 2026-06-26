// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MoveChain} from "./MoveChain.sol";
import {TripCredits} from "./TripCredits.sol";

contract MoveChainTest is Test {
    MoveChain internal moveChain;
    TripCredits internal tripCredits;

    // The rider private key is just picked abitrary
    uint256 internal constant RIDER_PK = 0xA11CE;
    address internal rider;

    // The operator and stranger address is picked abitrary
    address internal operator = address(0xB0B);
    address internal stranger = address(0xDEAD);

    uint256 internal constant PRICE = 5;

    // The form of the trip information the rider signs. Must be the same as in MoveChain.sol
    bytes32 internal constant TRIP_AUTH_TYPEHASH =
        keccak256("TripAuth(address rider,address operator,uint8 action,uint256 nonce,uint256 deadline)");

    // Two extra admin addresses for the constructor, picked arbitrary
    address internal admin2 = address(0xA2);
    address internal admin3 = address(0xA3);

    function setUp() public {
        // TripCredits is now deployed separately and passed into MoveChain.
        // The test contract owns TripCredits, so it can wire MoveChain as platform.
        TripCredits tripCredits_ = new TripCredits();
        tripCredits = tripCredits_;

        // The test contract deploys MoveChain, so address(this) is one of the admins.
        moveChain = new MoveChain(address(this), admin2, admin3, address(tripCredits_));
        tripCredits.addPlatform(address(moveChain));

        rider = vm.addr(RIDER_PK);
        moveChain.addOperator(operator, PRICE, "Test Operator");
    }

    event StartTrip_e(address indexed rider, address indexed operator);
    event CompleteTrip_e(address indexed rider, address indexed operator, uint256 cost);
    event PayoutCredits_e(address indexed operator, uint256 amount);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    // Give the rider the amount of Trip Credits
    function _buyRiderCredits(uint256 amount) internal {
        uint256 cost = amount * moveChain.getEthToCredit();
        vm.deal(rider, cost);
        vm.prank(rider);
        moveChain.buyCredits{value: cost}(amount);
    }

    // Signs a TripAuth with `signerPk`
    function _sign(
        uint256 signerPk,
        address auth_rider,
        address auth_operator,
        uint8 action,
        uint256 deadline
    ) internal view returns (bytes memory) {
        uint256 nonce = moveChain.getNonce(auth_rider);
        bytes32 structHash =
            keccak256(abi.encode(TRIP_AUTH_TYPEHASH, auth_rider, auth_operator, action, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", moveChain.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    // Signs a TripAuth for the test rider
    function _signRider(uint8 action, uint256 deadline) internal view returns (bytes memory) {
        return _sign(RIDER_PK, rider, operator, action, deadline);
    }

    // -------------------------------------------------------------------------
    // Revert when not Admin
    // -------------------------------------------------------------------------

    function test_AddOperator_RevertWhenNotAdmin() public {
        vm.prank(stranger);
        vm.expectRevert("Only admin");
        moveChain.addOperator(stranger, PRICE, "Stranger");
    }

    function test_SetRates_RevertWhenNotAdmin() public {
        vm.prank(stranger);
        vm.expectRevert("Only admin");
        moveChain.setEthToCredit(1);

        vm.prank(stranger);
        vm.expectRevert("Only admin");
        moveChain.setCreditToEth(1);
    }


    // -------------------------------------------------------------------------
    // Revert when not whitelisted operator
    // -------------------------------------------------------------------------
    function test_SetTripPrice_RevertWhenNotOperator() public {
        vm.prank(stranger);
        vm.expectRevert("Only whitelisted operator");
        moveChain.setTripPrice(99);
    }

    function test_StartTrip_RevertWhenNotOperator() public {
        vm.prank(stranger);
        vm.expectRevert("Only whitelisted operator");
        moveChain.startTrip(rider, block.timestamp + 1, "");
    }

    function test_CompleteTrip_RevertWhenNotOperator() public {
        vm.prank(stranger);
        vm.expectRevert("Only whitelisted operator");
        moveChain.completeTrip(rider, block.timestamp + 1, "");
    }

    function test_WithdrawCredits_RevertWhenNotOperator() public {
        vm.prank(stranger);
        vm.expectRevert("Only whitelisted operator");
        moveChain.withdrawCredits(1);
    }

    // -------------------------------------------------------------------------
    // Revert Buy Credits on not valid ETH amount
    // -------------------------------------------------------------------------

    function test_BuyCredits_RevertWhenTooLittleEth() public {
        uint256 amount = 3;
        uint256 cost = amount * moveChain.getEthToCredit();
        vm.deal(rider, cost);
        vm.prank(rider);
        vm.expectRevert("Not enough or too much ETH sent");
        moveChain.buyCredits{value: cost - 1}(amount);
    }

    function test_BuyCredits_RevertWhenTooMuchEth() public {
        uint256 amount = 3;
        uint256 cost = amount * moveChain.getEthToCredit();
        vm.deal(rider, cost + 1);
        vm.prank(rider);
        vm.expectRevert("Not enough or too much ETH sent");
        moveChain.buyCredits{value: cost + 1}(amount);
    }


    // -------------------------------------------------------------------------
    // Trip lifecycle (EIP-712 signed authorizations)
    // -------------------------------------------------------------------------

    function test_StartTrip_HappyPath() public {
        _buyRiderCredits(10);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signRider(moveChain.ACTION_START(), deadline);

        vm.expectEmit(true, true, false, true, address(moveChain));
        emit StartTrip_e(rider, operator);

        vm.prank(operator);
        moveChain.startTrip(rider, deadline, sig);

        assertTrue(moveChain.isOnTrip(rider));
        assertEq(moveChain.getNonce(rider), 1);
    }

    function test_CompleteTrip_HappyPath() public {
        _buyRiderCredits(10);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory startSig = _signRider(moveChain.ACTION_START(), deadline);
        vm.prank(operator);
        moveChain.startTrip(rider, deadline, startSig);

        bytes memory stopSig = _signRider(moveChain.ACTION_STOP(), deadline);

        vm.expectEmit(true, true, false, true, address(moveChain));
        emit CompleteTrip_e(rider, operator, PRICE);

        vm.prank(operator);
        moveChain.completeTrip(rider, deadline, stopSig);

        assertFalse(moveChain.isOnTrip(rider));
        assertEq(moveChain.creditsOf(rider), 10 - PRICE);
        assertEq(moveChain.creditsOf(operator), PRICE);
        assertEq(moveChain.getNonce(rider), 2); // one START + one STOP
    }

    function test_TwoPlatformsShareTripCredits() public {
        MoveChain moveChain2 = new MoveChain(address(this), admin2, admin3, address(tripCredits));
        tripCredits.addPlatform(address(moveChain2));

        _buyRiderCredits(10);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory startSig = _signRider(moveChain.ACTION_START(), deadline);
        vm.prank(operator);
        moveChain.startTrip(rider, deadline, startSig);

        assertTrue(moveChain.isOnTrip(rider));
        assertFalse(moveChain2.isOnTrip(rider));
    }

}
