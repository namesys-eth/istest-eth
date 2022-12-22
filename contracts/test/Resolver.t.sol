// SPDX-License-Identifier: WTFPL.ETH
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "src/Resolver.sol";

interface iOverloadResolver {
    function addr(bytes32 node, uint256 coinType) external view returns(bytes memory);
}

interface iResolver {
    function contenthash(bytes32 node) external view returns(bytes memory);
    function addr(bytes32 node) external view returns(address payable);
    function pubkey(bytes32 node) external view returns(bytes32 x, bytes32 y);
    function text(bytes32 node, string calldata key) external view returns(string memory);
    function name(bytes32 node) external view returns(string memory);
}

/**
 * @author 0xc0de4c0ffee, sshmatrix (BeenSick Labs)
 * @title Reolver tester
 */
contract ResolverGoerli is Test {
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);
  
    Resolver public ccip;
    string public testnet; 

    /// @dev : setup
    function setUp() public {
        ccip = new Resolver();
        testnet = "ethereum";
    }

    /// @dev : DNS encoder
    function DNSEncode(bytes memory _domain) internal pure returns(bytes memory _name, bytes32 _namehash) {
        uint i = _domain.length;
        _name = abi.encodePacked(bytes1(0));
        bytes memory _label;
        _namehash = bytes32(0);
        unchecked {
            while (i > 0) {
                --i;
                if(_domain[i] == bytes1(".")){
                    _name = bytes.concat(bytes1(uint8(_label.length)), _label, _name);
                    _namehash = keccak256(abi.encodePacked(_namehash, keccak256(_label)));
                    _label = "";
                } else {
                    _label = bytes.concat(_domain[i], _label);
                }
            }
            _name = bytes.concat(bytes1(uint8(_label.length)), _label, _name);
            _namehash = keccak256(abi.encodePacked(_namehash, keccak256(_label)));
        }
    }

    /// @dev : test DNS Encoder
    function testDNSEncoder() public {
        bytes memory _src = "nick.eth";
        (bytes memory _name, bytes32 _namehash) = DNSEncode(_src);
        assertEq(_name, bytes.concat(bytes1(uint8(4)), "nick", bytes1(uint8(3)), "eth", bytes1(0)));
        assertEq(_namehash, bytes32(0x05a67c0ee82964c4f7394cdd47fee7f4d9503a23c09c38341779ea012afe6e00));
    }

    /// @dev : test DNS Encode + Decode
    function testDNSEncodeDecode() public {
        bytes memory _test = "nick.istest.eth";
        (bytes memory _name, bytes32 _namehash) = DNSEncode(_test);
        assertEq(_name, bytes.concat(bytes1(uint8(4)), "nick", bytes1(uint8(6)), "istest", bytes1(uint8(3)), "eth", bytes1(0)));
        assertEq(_namehash,  bytes32(0x5c8e2e2882eecce2326008987fe586a80e922cfaa512aa14c21ff153775fe277));
        
        (string memory _name2, bytes32 _namehash2) = ccip.DNSDecode(_name); // pop 'istest' label
        assertEq(_name2, "nick.eth"); 
        assertEq(_namehash2, bytes32(0x05a67c0ee82964c4f7394cdd47fee7f4d9503a23c09c38341779ea012afe6e00));
    }

    /// @dev : test CCIP-Read call
    function testCCIPCall() public {
        bytes memory _src = "nick.istest.eth";
        (bytes memory _encoded,) = DNSEncode(_src);
        (string memory _name, bytes32 _namehash) = ccip.DNSDecode(_encoded);
        string[] memory _gateways = new string[](1);
        _gateways[0] = string.concat('https://sshmatrix.club:3002/', testnet, ":", _name, '/{data}');
        vm.expectRevert(
            abi.encodeWithSelector(
                Resolver.OffchainLookup.selector,
                address(ccip),
                _gateways,
                abi.encodePacked(abi.encodeWithSelector(
                    iResolver.contenthash.selector, 
                    _namehash              
                ), _encoded),
                Resolver.__callback.selector,
                abi.encode( // callback extradata
                    block.number,
                    _namehash,
                    keccak256(
                        abi.encodePacked(
                            blockhash(block.number - 1), 
                            _namehash, 
                            address(this)
                        )
                    )
                )
            )
        );
        ccip.resolve(_encoded, abi.encodeWithSelector(iResolver.contenthash.selector));
    }
    
    /// @dev : test signature
    function testSignature() public {
        uint PrivateKey = 0x3aefbbb707a2c7bd14f1c356a6eb07197e0fc80206e8ace3a29487ffffe8a242;
        address _coffee = vm.addr(PrivateKey);
        console.log(_coffee);
        assertTrue(ccip.isSigner(_coffee));
        
        bytes memory _src = "nick.istest.eth";
        (bytes memory _encoded,) = DNSEncode(_src);
        (, bytes32 _namehash) = ccip.DNSDecode(_encoded);
        // mimic HTTP response with response
        bytes memory response  = bytes('0x0000000000000000000000000000000000000000000000000000018535a79e41000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000413cb04c8f432369a565a2d27b4fd5b5ce3176aeb3c80560405add01998adc09b922aa93b2f0f90bc6da64812cec458571ed0ff30c517ebf72b57e741fc7c87e1f1b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002ae5010172002408011220066e20f72cc583d769bc8df5fedff24942b3b8941e827f023d306bdc7aecf5ac00000000000000000000000000000000000000000000');
        // BUG <<<< EvmError: Revert >>>> FAILING
        (uint256 __validity,
        bytes memory __signature,
        bytes memory __result) = abi.decode(response, (uint256, bytes, bytes));

        bytes memory _result = bytes('0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002ae5010172002408011220066e20f72cc583d769bc8df5fedff24942b3b8941e827f023d306bdc7aecf5ac00000000000000000000000000000000000000000000');
        assertEq(_result, __result); 
        bytes32 _digest = keccak256(
                    abi.encodePacked(
                        hex'1900',
                        address(ccip),
                        __validity, // validity in unix timestamp
                        _namehash,
                        _result
                    )
                );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(PrivateKey, _digest);
        assertEq(abi.encodePacked(r,s,v), __signature); 
        bytes memory _signature = bytes('0x3cb04c8f432369a565a2d27b4fd5b5ce3176aeb3c80560405add01998adc09b922aa93b2f0f90bc6da64812cec458571ed0ff30c517ebf72b57e741fc7c87e1f1b');
        assertEq(_signature, __signature); 
        uint256 _validity = uint256(1671642455617);
        assertEq(_validity, __validity); 
        assertTrue(ccip.isValid(_digest, _signature));
    }
}