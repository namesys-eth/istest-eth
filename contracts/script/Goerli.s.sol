// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "src/Resolver.sol";
//import "src/XCCIP.sol";
import "test/GenAddr.sol";
//import "src/Util.sol";

contract IsTestGoerli is Script {
    using GenAddr for address;
    //using Util for uint256;
    //using Util for bytes;

    function run() external {
        vm.startBroadcast();
    }
}
