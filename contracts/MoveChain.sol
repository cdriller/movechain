// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./TripCredits.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MoveChain is EIP712 {
    using ECDSA for bytes32;

    mapping(address => bool) public isAdmin;
    address[] admins;
    TripCredits tripCredits;

    uint256 ethToCredit;
    uint256 creditToEth;    // if we want to do a different back-conversion-rate (e.g. take a part for ourselves)

    struct Operator {
        bool whitelisted;
        uint256 price;
        uint256 totalEarningsInEth;
        string name;
    }

    mapping (address => Operator) public operators;
    address[] whitelistedOperators;

    modifier onlyAdmin {
        require(isAdmin[msg.sender], "Only admin");
        _;
    }

    modifier onlyOperator {
        require(operators[msg.sender].whitelisted == true, "Only whitelisted operator");
        _;
    }

    struct Trip {
        address rider;
        address operator;
    }

    // From riders perspective: contains an operator if on a trip or address(0)
    mapping (address => address) runningTrips;

    // open trips by operator
    mapping (address => Trip[]) openTrips;

    uint8 public constant ACTION_START = 0;
    uint8 public constant ACTION_STOP = 1;

    // The definition how the data is structured which the rider signs.
    bytes32 private constant TRIP_AUTH_TYPEHASH =
        keccak256("TripAuth(address rider,address operator,uint8 action,uint256 nonce,uint256 deadline)");

    // The next nonces for each rider.
    mapping (address => uint256) private _nonces;

    event StartTrip_e(address indexed rider, address indexed operator);
    event CompleteTrip_e(address indexed rider, address indexed operator, uint256 cost);
    event PayoutCredits_e(address indexed operator, uint256 amount);
    event AdminAdded_e(address indexed admin, address indexed addedBy);

    constructor(
        address admin1,
        address admin2,
        address admin3,
        address tripCreditsAddress
    ) EIP712("MoveChain", "1") {
        require(tripCreditsAddress != address(0), "zero address");

        _addAdmin(admin1);
        _addAdmin(admin2);
        _addAdmin(admin3);

        // TripCredits is deployed separately to keep MoveChain deployments cheap.
        // The deployer wires MoveChain as a platform via TripCredits.addPlatform()
        // after deployment (MoveChain is not the owner of TripCredits anymore).
        tripCredits = TripCredits(tripCreditsAddress);
        creditToEth = 0.0000000001 ether;
        ethToCredit = 0.0000000001 ether;
    }

    // Admin functions

    function addAdmin(address newAdmin) public onlyAdmin {
        _addAdmin(newAdmin);
    }

    function getAdmins() public view returns (address[] memory) {
        return admins;
    }

    function _addAdmin(address newAdmin) private {
        require(newAdmin != address(0), "zero address");
        require(!isAdmin[newAdmin], "Already admin");

        isAdmin[newAdmin] = true;
        admins.push(newAdmin);

        emit AdminAdded_e(newAdmin, msg.sender);
    }

    function addOperator(address operator, uint256 _price, string calldata _name) public onlyAdmin {
        require(operator != address(0), "zero address");
        require(bytes(_name).length > 0, "name required");
        require(!operators[operator].whitelisted, "Operator already whitelisted");

        operators[operator] = Operator({
            whitelisted: true,
            price: _price,
            totalEarningsInEth: 0,
            name: _name
        });

        whitelistedOperators.push(operator);
    }

    function setEthToCredit(uint256 _ethToCredit) public onlyAdmin {
        ethToCredit = _ethToCredit;
    }

    function setCreditToEth(uint256 _creditToEth) public onlyAdmin {
        creditToEth = _creditToEth;
    }

    function setOperatorName(address operator, string calldata _name) public onlyAdmin {
        require(operators[operator].whitelisted, "Operator is not on whitelist");
        require(bytes(_name).length > 0, "name required");
        operators[operator].name = _name;
    }

    function removeOperator(address operator) public onlyAdmin {
        require(operators[operator].whitelisted, "Operator is not on whitelist");

        operators[operator].whitelisted = false;
        uint256 length = whitelistedOperators.length;
        for (uint256 i = 0; i < length; i++) {
            if (whitelistedOperators[i] == operator) {
                whitelistedOperators[i] = whitelistedOperators[length - 1];
                whitelistedOperators.pop();
                break;
            }
        }
    }

    function getWhitelistedOperators() public view returns (address[] memory) {
        return whitelistedOperators;
    }

    // Operator functions

    function setTripPrice(uint256 _price) public onlyOperator {
        operators[msg.sender].price = _price;
    }

    function startTrip(address rider, uint256 deadline, bytes calldata signature) public onlyOperator {
        require(block.timestamp <= deadline, "Authorization expired");
        require(runningTrips[rider] == address(0), "Rider is already on a trip");
        require(
            tripCredits.getCredits(rider) >= operators[msg.sender].price,
            "Rider doesn't have enough Credits"
        );

        _verifyTripAuth(rider, msg.sender, ACTION_START, deadline, signature);

        Trip memory trip = Trip({
            rider: rider,
            operator: msg.sender
        });

        openTrips[msg.sender].push(trip);
        runningTrips[rider] = msg.sender;

        emit StartTrip_e(rider, msg.sender);
    }

    function completeTrip(address rider, uint256 deadline, bytes calldata signature) public onlyOperator {
        require(block.timestamp <= deadline, "Authorization expired");
        require(runningTrips[rider] != address(0), "Rider is not on a trip");

        _verifyTripAuth(rider, msg.sender, ACTION_STOP, deadline, signature);

        runningTrips[rider] = address(0);

        // remove trip from the operator's open trips
        bool found = false;
        Trip[] storage trips = openTrips[msg.sender];
        for (uint256 i = 0; i < trips.length; i++) {
            if (trips[i].rider == rider) {
                trips[i] = trips[trips.length - 1];
                trips.pop();
                found = true;
                break;
            }
        }
        require(found, "No open trip for this operator");

        // transfer the credits for the trip
        uint256 tripCost = operators[msg.sender].price;
        tripCredits.removeCredits(rider, tripCost);
        tripCredits.addCredits(msg.sender, tripCost);

        emit CompleteTrip_e(rider, msg.sender, tripCost);
    }

    function withdrawCredits(uint256 amount) public onlyOperator {
        require(amount <= tripCredits.getCredits(msg.sender), "Not enough Credits");

        // burn the operator's credits before paying out to avoid double withdrawal
        tripCredits.removeCredits(msg.sender, amount);

        uint256 eth = creditToEth * amount;
        (bool success, ) = payable(msg.sender).call{value: eth}("");
        require(success, "Transfer failed");

        operators[msg.sender].totalEarningsInEth += eth;

        emit PayoutCredits_e(msg.sender, amount);
    }

    // Operator and Rider functions

    function getCreditBalance() public view returns(uint256) {
        return tripCredits.getCredits(msg.sender);
    }

    // Rider functions

    function buyCredits(uint256 amount) public payable {
        require(msg.value == amount * ethToCredit, "Not enough or too much ETH sent");

        tripCredits.addCredits(msg.sender, amount);
    }

    function getOperatorPrice(address operator) public view returns(uint256) {
        require(operators[operator].whitelisted, "Invalid Operator");
        return operators[operator].price;
    }

    function getOperatorName(address operator) public view returns(string memory) {
        return operators[operator].name;
    }

    function getOperator(address operator) public view returns(Operator memory) {
        return operators[operator];
    }

    // Views used by the frontend

    function creditsOf(address account) public view returns(uint256) {
        return tripCredits.getCredits(account);
    }

    function getNonce(address rider) public view returns(uint256) {
        return _nonces[rider];
    }

    function isOnTrip(address rider) public view returns(bool) {
        return runningTrips[rider] != address(0);
    }

    function getTripOperator(address rider) public view returns(address) {
        return runningTrips[rider];
    }

    function getEthToCredit() public view returns(uint256) {
        return ethToCredit;
    }

    function getCreditToEth() public view returns(uint256) {
        return creditToEth;
    }

    function domainSeparator() public view returns(bytes32) {
        return _domainSeparatorV4();
    }



    function _verifyTripAuth(
        address rider,
        address operator,
        uint8 action,
        uint256 deadline,
        bytes calldata signature
    ) private {
        bytes32 structHash = keccak256(
            abi.encode(TRIP_AUTH_TYPEHASH, rider, operator, action, _nonces[rider], deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == rider, "Invalid rider signature");

        _nonces[rider] += 1;
    }
}
