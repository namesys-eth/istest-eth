// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "src/Resolver.sol";
import "test/GenAddr.sol";
import "src/Interface.sol";

contract IsTestGoerli is Script {
    using GenAddr for address;
    iENS public ENS = iENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

    function run() external {
        vm.startBroadcast();

        /// @dev : Generate contract address before deployment
        address deployer = address(msg.sender);
        address istest = deployer.genAddr(vm.getNonce(deployer) + 1);
        
        /// @dev : Deploy
        Resolver resolver = new Resolver();

        /// @dev : Check if generated address matches deployed address
        require(address(resolver) == istest, "CRITICAL: ADDRESSES NOT MATCHING");

        /// @dev : hash of 'istest1.eth' 
        bytes32 namehash = keccak256(
            abi.encodePacked(keccak256(abi.encodePacked(bytes32(0), keccak256("eth"))), keccak256("istest1"))
        );
        /// @dev : set resolver of 'istest1.eth' 
        ENS.setResolver(namehash, address(resolver));
        vm.stopBroadcast();
        resolver;
    }
}
