// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TripCredits is ERC1155 {
    address owner;
    address platform;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    modifier onlyPlatform {
        require(msg.sender == platform);
        _;

    }

    constructor() ERC1155("") {
        owner = msg.sender;
    }

    function setPlatform(address _platform) public onlyOwner {
        platform = _platform;
    }

    function addCredits(address to, uint256 amount) public onlyPlatform {
        _mint(to, 0, amount, "");
    }

    function removeCredits(address from, uint256 amount) public onlyPlatform {
        _burn(from, 0, amount);
    }

    function getCredits(address account) public view onlyPlatform returns(uint256) {
        return balanceOf(account, 0);
    }


}