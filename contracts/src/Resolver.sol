//SPDX-License-Identifier: WTFPL.ETH
pragma solidity > 0.8 .0 < 0.9 .0;

import "src/Interface.sol";

/**
 * @author 0xc0de4c0ffee, sshmatrix (BeenSick Labs/BENSYC)
 * @title WLNR Base
 */
contract Resolver {

    address public Dev;
    iENS public ENS;

    /// @dev : Error events
    error RequestError();
    error InvalidSignature();
    error InvalidHash();
    error SignatureExpired();
    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    /// @dev : Gateway struct
    struct Gate {
        string domain;
        address operator;
    }
    Gate[] public Gateways;
    mapping(address => bool) public isSigner;

    /**
     * @dev Constructor
     */
    constructor() {
        Gateways.push(Gate("goerli.namesys.xyz", 0xA0896ab9606EA2CF884549030Ddc960A11b1e630)); // set initial gateway addr here
        isSigner[0xA0896ab9606EA2CF884549030Ddc960A11b1e630] = true;
        ENS = iENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    }

    /**
     * @dev DNSDecode() function for web2 CCIP middleware
     * @param name : name to resolve
     */
    function DNSDecode(bytes calldata name) public pure returns(string memory gname, bytes32 _namehash) {
        uint j;
        uint len;
        bytes[] memory labels = new bytes[](12); // max 11 ...sub.sub.domain.eth
        for (uint i; name[i] > 0x0;) {
            len = uint8(bytes1(name[i: ++i]));
            labels[j] = name[i: i += len];
            j++;
        }
        gname = string(labels[--j]); //.eth
        _namehash = keccak256(abi.encodePacked(bytes32(0), keccak256(labels[j--]))); //.eth
        if (j == 0) // istest.eth
            return (
                string.concat(string(labels[0]), ".", gname),
                keccak256(abi.encodePacked(_namehash, keccak256(labels[0])))
            );

        while (j > 0) {
            gname = string.concat(string(labels[--j]), ".", gname);
            _namehash = keccak256(abi.encodePacked(_namehash, keccak256(labels[j])));
        }
    }

    /**
     * @dev selects random gateway for CCIP resolution
     * @param gname : gateway label
     */
    function randomGateways(string memory gname) public view returns(string[] memory urls) {
        uint gLen = Gateways.length;
        uint len = (gLen / 2) + 1;
        if (len > 5) len = 5;
        urls = new string[](len);
        uint k = block.timestamp;
        for (uint i; i < len; i++) {
            k = uint(keccak256(abi.encodePacked(k, gname, msg.sender, blockhash(block.number - 1)))) % gLen;
            urls[i] = string.concat("https://", Gateways[k].domain, "/", gname, "/{data}");
        }
    }

    /**
     * @dev resolves a name with CCIP
     * @param name : name to resolve
     * @param data : CCIP call data
     */
    function resolve(bytes calldata name, bytes calldata data) external view returns(bytes memory) {
        (string memory gname, bytes32 namehash) = DNSDecode(name);
        revert OffchainLookup(
            address(this), // callback contract
            randomGateways(gname), // gateway URL array
            bytes.concat( //request {data}
                data[: 4],
                namehash,
                data.length > 36 ? data[36: ] : bytes("")
            ),
            Resolver.__callback.selector, // callback function
            abi.encode( // callback extradata
                block.number,
                namehash,
                keccak256(
                    abi.encodePacked(
                        blockhash(block.number - 1), 
                        namehash, 
                        msg.sender
                    )
                )
            )
        );
    }

    /**
     * @dev callback function
     */
    function __callback(
        bytes calldata response, // data from web2 gateway
        bytes calldata extraData // extradata from resolve function
    ) external view returns(bytes memory) {
        (uint blknum, bytes32 namehash, bytes32 _hash) = abi.decode(extraData, (uint, bytes32, bytes32));
        if (block.number > blknum + 3 || _hash != keccak256(abi.encodePacked(blockhash(blknum - 1), namehash, msg.sender)))
            revert InvalidHash(); //extra hash check, timeout @ 3 blocks

        (uint64 _validity,
            bytes memory _signature,
            bytes memory _result) = abi.decode(response, (uint64, bytes, bytes));
        if (block.timestamp > _validity) revert SignatureExpired();
        if (!Resolver(address(this)).isValid( // signature check
                keccak256(
                    abi.encodePacked(
                        hex"1900",
                        address(this),
                        _validity,
                        namehash,
                        _result
                    )
                ),
                _signature
            )) revert InvalidSignature();
        return _result;
    }

    /**
     * @dev checks if a signature is valid
     * @param hash : hash of signed message
     * @param signature : signature to verify
     */
    function isValid(bytes32 hash, bytes calldata signature) external view returns(bool) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        if (signature.length > 64) {
            r = bytes32(signature[: 32]);
            s = bytes32(signature[32: ]);
            v = uint8(bytes1(signature[64]));
        } else {
            r = bytes32(signature[: 32]);
            bytes32 vs = bytes32(signature[32: ]);
            s = vs & bytes32(0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
            v = uint8((uint256(vs) >> 255) + 27);
        }
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0)
            revert InvalidSignature();
        address _signer = ecrecover(hash, v, r, s);
        return (_signer != address(0) && isSigner[_signer]);
    }

    /// @dev : GATEWAY MANAGEMENT
    modifier onlyDev() {
        require(msg.sender == Dev);
        _;
    }

    /**
     * @dev add gateway to the list
     * @param operator : controller of gateway
     * @param domain : domain gateway
     */
    function addGateway(address operator, string calldata domain) external onlyDev {
        require(!isSigner[operator], "OPERATOR_EXISTS");
        Gateways.push(Gate(
            domain,
            operator
        ));
        isSigner[operator] = true;
    }

     /**
     * @dev remove gateway from the list
     * @param _index : gateway index
     */
    function removeGateway(uint _index) external onlyDev {
        isSigner[Gateways[_index].operator] = false;
        unchecked {
            if (Gateways.length > _index + 1)
                Gateways[_index] = Gateways[Gateways.length - 1];
        }
        Gateways.pop();
    }

    /**
     * @dev replace gateway for a given controller
     * @param _index : gateway index to replace
     * @param operator : controller of gateway
     * @param domain : new domain gateway
     */
    function replaceGateway(uint _index, address operator, string calldata domain) external onlyDev {
        require(!isSigner[operator], "Duplicate_Operator");
        isSigner[Gateways[_index].operator] = false;
        Gateways[_index] = Gate(domain, operator);
        isSigner[operator] = true;
    }
}