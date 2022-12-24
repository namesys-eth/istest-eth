// SPDX-License-Identifier: WTFPL.ETH
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "src/Resolver.sol";

/// @dev : Interface
interface iResolver {
    function contenthash(bytes32 node) external view returns(bytes memory);
}

/**
 * @author 0xc0de4c0ffee, sshmatrix (BeenSick Labs)
 * @title Reolver tester
 */
contract ResolverGoerli is Test {
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);
  
    Resolver public CCIP;
    string public chainID; 

    /// @dev : setup
    function setUp() public {
        CCIP = new Resolver();
        chainID = "1";
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

    /// @dev : get some values
    function testConstants() public view {
        bytes memory _src = "vitalik.eth";
        (bytes memory _name,) = DNSEncode(_src);
        console.logBytes(_name);
        bytes memory _test = "vitalik.istest.eth";
        (, bytes32 _namehash) = DNSEncode(_test);
        console.logBytes32(_namehash);
        console.logBytes4(Resolver.resolve.selector);
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
        
        (string memory _name2, bytes32 _namehash2) = CCIP.DNSDecode(_name); // pop 'istest' label
        assertEq(_name2, "nick.eth"); 
        assertEq(_namehash2, bytes32(0x05a67c0ee82964c4f7394cdd47fee7f4d9503a23c09c38341779ea012afe6e00));
    }

    /// @dev : test CCIP-Read call
    function testCCIPRevert() public {
        bytes memory _src = "nick.istest.eth";
        (bytes memory _encoded,) = DNSEncode(_src);
        (string memory _name, bytes32 _namehash) = CCIP.DNSDecode(_encoded);
        string[] memory _gateways = new string[](1);
        _gateways[0] = string.concat('https://sshmatrix.club:3002/eip155:', chainID, "/", _name, '/{data}');
        vm.expectRevert(
            abi.encodeWithSelector(
                Resolver.OffchainLookup.selector,
                address(CCIP),
                _gateways,
                abi.encodeWithSelector(
                    iResolver.contenthash.selector, 
                    _namehash            
                ),
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
        CCIP.resolve(_encoded, abi.encodeWithSelector(iResolver.contenthash.selector));
    }
    
    /// @dev : test full end-to-end CCIP
    function testCCIPCallback() public {
        bytes memory _src = "vitalik.istest.eth";
        (bytes memory _encoded, ) = DNSEncode(_src);
        (string memory _name, bytes32 _namehash) = CCIP.DNSDecode(_encoded);
        string[] memory _gateways = new string[](1);
        _gateways[0] = string.concat('https://sshmatrix.club:3002/eip155:', chainID, "/", _name, '/{data}');
        bytes memory _data = abi.encodeWithSelector(
            iResolver.contenthash.selector,
            _namehash
        );
        bytes memory _extraData = abi.encode( // callback extradata
            block.number,
            _namehash,
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    _namehash,
                    address(this)
                )
            )
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                Resolver.OffchainLookup.selector,
                address(CCIP),
                _gateways,
                _data,
                Resolver.__callback.selector,
                _extraData
            )
        );

        CCIP.resolve(_encoded, abi.encodeWithSelector(iResolver.contenthash.selector));
        bytes memory _ipns = hex'e3010170122081e99109634060bae2c1e3f359cda33b2232152b0e010baf6f592a39ca228850';
        //? _ipns = abi.encode(_ipns); 
        uint64 _validity = uint64(block.timestamp) + 600;
        bytes32 _digest = keccak256(
            abi.encodePacked(
                hex'1900',
                address(CCIP),
                _validity,
                _namehash,
                _ipns
            )
        );
        uint PrivateKey = 0x3aefbbb707a2c7bd14f1c356a6eb07197e0fc80206e8ace3a29487ffffe8a242;
        address _coffee = vm.addr(PrivateKey);
        assertTrue(CCIP.isSigner(_coffee));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(PrivateKey, _digest);
        bytes memory _signature = abi.encodePacked(r, s, v);
        assertTrue(CCIP.isValid(_digest, _signature));
        bytes memory _response = abi.encode(
            _validity,
            _signature,
            _ipns
        );
        assertEq(_ipns, CCIP.__callback(_response, _extraData));
    }
}