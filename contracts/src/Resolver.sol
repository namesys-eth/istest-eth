//SPDX-License-Identifier: WTFPL.ETH
pragma solidity >0.8.0 <0.9.0;

/**
 * @author 0xc0de4c0ffee, sshmatrix (BeenSick Labs)
 * @title IsTest CCIP Resolver
 */
contract Resolver {
    address public Dev;
    string public chainID = "5";

    /// @dev : Error events
    error RequestError();
    error InvalidSignature(string reason);
    error InvalidHash();
    error InvalidResponse();
    error SignatureExpired();
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );

    function supportsInterface(bytes4 sig) external pure returns (bool) {
        return (sig == Resolver.resolve.selector ||
            sig == Resolver.supportsInterface.selector);
    }

    /// @dev : Emitted events
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event ChainIDChanged(string chainID, string newChainID);
    event NewGateway(address operator, string domain);
    event RemovedGateway(uint index, address operator, string domain);
    event ReplacedGateway(
        uint index,
        address operator,
        string oldDomain,
        string newDomain
    );

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
        Dev = msg.sender;
        /// @dev : set initial Gateway here
        Gateways.push(
            Gate(
                "sshmatrix.club:3002",
                0xDCEfAFB32B6e2Eaa7172B6216ca5973037fE989F
            )
        );
        isSigner[0xDCEfAFB32B6e2Eaa7172B6216ca5973037fE989F] = true;
    }

    /**
     * @dev Custom DNSDecode() function [see ENSIP-10]
     * @param encoded : encoded byte string
     * @return _name : name to resolve on testnet
     * @return namehash : hash of name to resolve on testnet
     */
    function DNSDecode(
        bytes calldata encoded
    ) public pure returns (string memory _name, bytes32 namehash) {
        uint j;
        uint len;
        bytes[] memory labels = new bytes[](12); // max 11 ...bob.alice.istest.eth
        for (uint i; encoded[i] > 0x0; ) {
            len = uint8(bytes1(encoded[i:++i]));
            labels[j] = encoded[i:i += len];
            j++;
        }
        _name = string(labels[--j]); // 'eth' label
        // pop 'istest' label
        namehash = keccak256(
            abi.encodePacked(bytes32(0), keccak256(labels[j--]))
        ); // namehash of 'eth'
        if (j == 0) {
            // istest.eth
            return (
                string.concat(string(labels[0]), ".", _name),
                keccak256(abi.encodePacked(namehash, keccak256(labels[0])))
            );
        }

        while (j > 0) {
            // return ...bob.alice.eth
            _name = string.concat(string(labels[--j]), ".", _name); // pop 'istest' label
            namehash = keccak256(
                abi.encodePacked(namehash, keccak256(labels[j]))
            ); // namehash without 'istest' label
        }
    }

    /**
     * @dev Selects and construct random gateways for CCIP resolution
     * @param _name : name to resolve on testnet e.g. alice.eth
     * @return urls : ordered list of gateway URLs for HTTP calls
     */
    function randomGateways(
        string memory _name
    ) public view returns (string[] memory urls) {
        uint gLen = Gateways.length;
        uint len = (gLen / 2) + 1;
        if (len > 5) len = 5;
        urls = new string[](len);
        // pseudo random seeding
        uint k = uint(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    _name,
                    msg.sender,
                    blockhash(block.number - 1)
                )
            )
        );
        for (uint i; i < len; ) {
            k = uint(keccak256(abi.encodePacked(k, msg.sender))) % gLen;
            // Gateway @ URL e.g. https://example.xyz/eip155:1/alice.eth/{data}
            urls[i++] = string.concat(
                "https://",
                Gateways[k].domain,
                "/eip155",
                ":",
                chainID,
                "/",
                _name,
                "/{data}"
            );
        }
    }

    /**
     * @dev Resolves a name with CCIP-Read OffChainLookup()
     * @param encoded : DNS-encoded mainnet name e.g. alice.istest.eth
     * @param data : CCIP call data
     */
    function resolve(
        bytes calldata encoded,
        bytes calldata data
    ) external view returns (bytes memory) {
        (string memory _name, bytes32 namehash) = DNSDecode(encoded);
        revert OffchainLookup(
            address(this), // sender/callback contract
            randomGateways(_name), // gateway URL array
            bytes.concat( // custom callData {data} [see ENSIP-10] + encoded name for eth_call by HTTP gateway
                data[:4],
                namehash,
                data.length > 36 ? data[36:] : bytes("")
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
     * @dev CCIP callback function
     * @param response : response of HTTP call
     * @param extraData : extradata from resolve function
     */
    function __callback(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        /// decode extraData
        (uint blocknum, bytes32 namehash, bytes32 _hash) = abi.decode(
            extraData,
            (uint, bytes32, bytes32)
        );
        /// check hash & timeout @ 3 blocks
        if (
            block.number > blocknum + 3 ||
            _hash !=
            keccak256(
                abi.encodePacked(blockhash(blocknum - 1), namehash, msg.sender)
            )
        ) revert InvalidHash();
        /// decode signature
        (uint64 _validity, bytes memory _signature, bytes memory _result) = abi
            .decode(response, (uint64, bytes, bytes));
        /// check null HTTP response
        // if (bytes1(_result) == bytes1(bytes("0x0"))) revert InvalidResponse();
        /// check signature expiry
        if (block.timestamp > _validity) revert SignatureExpired();
        /// check signature content
        if (
            !Resolver(address(this)).isValid(
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
            )
        ) revert InvalidSignature("Final_Check_Fail");
        return _result;
    }

    /**
     * @dev Checks if a signature is valid
     * @param digest : hash of signed message
     * @param signature : compact signature to verify
     */
    function isValid(
        bytes32 digest,
        bytes calldata signature
    ) external view returns (bool) {
        bytes32 s;
        uint8 v;
        bytes32 r = bytes32(signature[:32]);
        if (signature.length > 64) {
            s = bytes32(signature[32:64]);
            v = uint8(uint256(bytes32(signature[64:])));
        } else if (signature.length == 64) {
            bytes32 vs = bytes32(signature[32:]);
            s =
                vs &
                bytes32(
                    0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
                );
            v = uint8((uint256(vs) >> 255) + 27);
        } else {
            revert InvalidSignature("Wrong_Length");
        }
        /// Check for bad signature
        if (
            uint256(s) >
            0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
        ) revert InvalidSignature("S_Value_Overflow");
        /// Recover signer
        address _signer = ecrecover(digest, v, r, s);
        return (_signer != address(0) && isSigner[_signer]);
    }

    /// @dev : Gateway and Chain Management Functions
    modifier onlyDev() {
        require(msg.sender == Dev);
        _;
    }

    /**
     * @dev Push new gateway to the list
     * @param operator : controller of new gateway
     * @param domain : new gateway domain
     */
    function addGateway(
        address operator,
        string calldata domain
    ) external onlyDev {
        require(!isSigner[operator], "OPERATOR_EXISTS");
        Gateways.push(Gate(domain, operator));
        isSigner[operator] = true;
        emit NewGateway(operator, domain);
    }

    /**
     * @dev Remove gateway from the list
     * @param _index : gateway index to remove
     */
    function removeGateway(uint _index) external onlyDev {
        isSigner[Gateways[_index].operator] = false;
        emit RemovedGateway(
            _index,
            Gateways[_index].operator,
            Gateways[_index].domain
        );
        unchecked {
            if (Gateways.length > _index + 1)
                Gateways[_index] = Gateways[Gateways.length - 1];
        }
        Gateways.pop();
    }

    /**
     * @dev Replace gateway for a given controller
     * @param _index : gateway index to replace
     * @param operator : controller of gateway
     * @param domain : new gateway domain
     */
    function replaceGateway(
        uint _index,
        address operator,
        string calldata domain
    ) external onlyDev {
        require(!isSigner[operator], "DUPLICATE_OPERATOR");
        emit ReplacedGateway(_index, operator, Gateways[_index].domain, domain);
        isSigner[Gateways[_index].operator] = false;
        Gateways[_index] = Gate(domain, operator);
        isSigner[operator] = true;
    }

    /**
     * @dev : Transfer contract ownership to new Dev
     * @param newDev : new Dev
     */
    function changeDev(address newDev) external onlyDev {
        emit OwnershipTransferred(Dev, newDev);
        Dev = newDev;
    }

    /**
     * @dev : Changes CCIP-Read source chain ID
     * @param newChainID : new source chain ID
     */
    function changeChainID(string calldata newChainID) external onlyDev {
        emit ChainIDChanged(chainID, newChainID);
        chainID = newChainID;
    }
}
