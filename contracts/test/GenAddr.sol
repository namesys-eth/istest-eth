//SPDX-License-Identifier: WTFPL v6.9
pragma solidity >= 0.8 .0;

library GenAddr {
    /// @notice : https://ethereum.stackexchange.com/questions/760/how-is-the-address-of-an-ethereum-contract-computed
    /// @dev
    /// @param deployer : Address of contract deployer
    /// @param nonce : Nonce for contract deployment
    /// @return Address of contract deployed at nonce
    function genAddr(address deployer, uint256 nonce) internal pure returns (address) {
        bytes memory _hash;
        if (nonce == 0x00) {
            _hash = abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, bytes1(0x80));
        } else if (nonce <= 0x7f) {
            _hash = abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, bytes1(uint8(nonce)));
        } else if (nonce <= 0xff) {
            _hash = abi.encodePacked(bytes1(0xd7), bytes1(0x94), deployer, bytes1(0x81), uint8(nonce));
        } else if (nonce <= 0xffff) {
            _hash = abi.encodePacked(bytes1(0xd8), bytes1(0x94), deployer, bytes1(0x82), uint16(nonce));
        } else if (nonce <= 0xffffff) {
            _hash = abi.encodePacked(bytes1(0xd9), bytes1(0x94), deployer, bytes1(0x83), uint24(nonce));
        } else {
            _hash = abi.encodePacked(bytes1(0xda), bytes1(0x94), deployer, bytes1(0x84), uint32(nonce));
        }
        return address(uint160(uint256(keccak256(_hash))));
    }
}
