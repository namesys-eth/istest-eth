// SPDX-License-Identifier: WTFPL.ETH
pragma solidity >0.8.0 <0.9.0;

/**
 * @dev istest Resolver Interface
 */
interface iResolver {
    function contenthash(bytes32 bond) external view returns (bytes memory);
    //function addr(bytes32 bond) external view returns (address payable);
    //function addr2(bytes32 bond, uint256 coinType) external view returns (bytes memory);
    //function pubkey(bytes32 bond) external view returns (bytes32 x, bytes32 y);
    //function text(bytes32 bond, string calldata key) external view returns (string memory);
}