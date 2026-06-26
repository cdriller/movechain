// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TripCredits is ERC1155 {
    address owner;
    mapping(address => bool) public platforms;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    modifier onlyPlatform {
        require(platforms[msg.sender]);
        _;

    }

    constructor() ERC1155("") {
        owner = msg.sender;
    }

    function addPlatform(address _platform) public onlyOwner {
        platforms[_platform] = true;
    }

    function removePlatform(address _platform) public onlyOwner {
        platforms[_platform] = false;
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
