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
contract ResolverTest is Test {
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);
    error RequestError(bytes32 expected, bytes32 result, bytes extradata, uint blknum, bytes response);
  
    Resolver public ccip;

    /// @dev : setup
    function setUp() public {
        ccip = new Resolver();
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
        bytes memory _src = "virgil.eth";
        (bytes memory _name, bytes32 _namehash) = DNSEncode(_src);
        assertEq(_name, bytes.concat(bytes1(uint8(6)), "virgil", bytes1(uint8(3)), "eth", bytes1(0)));
        assertEq(_namehash, bytes32(0x2abe74dc42b79fff0accc104dbf6ef6f150d5eb4ba14cdae4a404eb7890d2e19));
    }

    /// @dev : test DNS Encode + Decode
    function testDNSEncodeDecode() public {
        bytes memory _test = "virgil.istest.eth";
        (bytes memory _name, bytes32 _namehash) = DNSEncode(_test);
        assertEq(_name, bytes.concat(bytes1(uint8(6)), "virgil", bytes1(uint8(6)), "istest", bytes1(uint8(3)), "eth", bytes1(0)));
        assertEq(_namehash, bytes32(0xf57872f8902c1f99b0ed6706fae19a66cf44fe09efa1bbf732f832da24d90223));
        
        (string memory _name2, bytes32 _namehash2) = ccip.DNSDecode(_name);
        assertEq(_name2, "virgil.eth");
        assertEq(_namehash2, bytes32(0x2abe74dc42b79fff0accc104dbf6ef6f150d5eb4ba14cdae4a404eb7890d2e19));
    }

    /// @dev : test if 36-byte call reverts [?]
    function testRevertLen36() public {
        bytes memory _src = "virgil.istest.eth";
        (bytes memory _srcName, bytes32 _srcHash) = DNSEncode(_src);
        (, bytes32 _digestHash) = ccip.DNSDecode(_srcName);
        string[] memory _gateways = new string[](1);
        _gateways[0] = 'https://goerli.namesys.xyz/virgil.eth/{data}';
        vm.expectRevert(
            abi.encodeWithSelector(
                Resolver.OffchainLookup.selector,
                address(ccip),
                _gateways,
                abi.encodeWithSelector(
                    iResolver.addr.selector, 
                    _digestHash
                ),
                Resolver.__callback.selector,
                abi.encode( // callback extradata
                    block.number,
                    _digestHash,
                    keccak256(
                        abi.encodePacked(
                            blockhash(block.number - 1), 
                            _digestHash, 
                            address(this)
                        )
                    )
                )
            )
        );
        ccip.resolve(_srcName, abi.encodeWithSelector(iResolver.addr.selector, _srcHash));
    }
    
    /// @dev : test signature
    function testSignature() public {
        uint PrivateKey = 0xc0de4c0ffeee;
        address _coffee = vm.addr(PrivateKey);
        console.log(_coffee);
        assertTrue(ccip.isSigner(_coffee));

        bytes memory _src = "virgil.istest.eth";
        (bytes memory _srcName, bytes32 _srcHash) = DNSEncode(_src);
        (, bytes32 _digestHash) = ccip.DNSDecode(_srcName);
        string[] memory _gateways = new string[](1);
        _gateways[0] = 'https://goerli.namesys.xyz/virgil.eth/{data}';
        bytes memory _extradata;
        vm.expectRevert(
            abi.encodeWithSelector(
                Resolver.OffchainLookup.selector,
                address(ccip),
                _gateways,
                abi.encodeWithSelector(
                    iResolver.addr.selector, 
                    _digestHash
                ),
                Resolver.__callback.selector,
                _extradata = abi.encode( // callback extradata
                    block.number,
                    _digestHash,
                    keccak256(
                        abi.encodePacked(
                            blockhash(block.number - 1), 
                            _digestHash, 
                            address(this)
                        )
                    )
                )
            )
        );
        ccip.resolve(_srcName, abi.encodeWithSelector(iResolver.addr.selector, _srcHash));
        bytes memory _result = abi.encode(address(0xc0De4c0FFEEC0dE4C0FfeEC0de4c0fFeec0ffee0));
        bytes32 _digest = keccak256(
                    abi.encodePacked(
                        hex"1900",
                        address(ccip),
                        uint64(block.timestamp + 42),
                        _digestHash,
                        _result
                    )
                );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(PrivateKey, _digest);
        assertTrue(ccip.isValid(_digest, abi.encodePacked(r,s,v)));
        //vm.warp(1 days + 1 seconds); // fast forward one second past the deadline
    }
}
/*    
    
        assertEq(
            ccip.__callback(
                abi.encodePacked(
                    _digestHash,
                    _calldata
                ),
                extradata),
            _result
        );

    function testRevert() public {
        //ccip.resolve(
        //    hex"07766974616c696b0662656e7379630365746800",
        //    hex"ffffffffee6c4522aab0003e8d14cd40a6af439055fd2577951148c14b6cea9a53475835"
        //);
        assertTrue(true);
    }
}   
//0000000000000000000000000000000000000000000000000000000000ef1af0
//ee6c4522aab0003e8d14cd40a6af439055fd2577951148c14b6cea9a53475835
//b787f80a5b6e98a2eec618d24e178d8df1ff72e5f49d0f0b22c3ce53504bebc5 */