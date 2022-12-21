pragma solidity >=0.8.0 <0.9.0;

/// @dev : Utils library for bytes
library LibBytes {  
  function slice(
        bytes memory _bytes,
        uint256 _start,
        uint256 _length
    )
        internal
        pure
        returns (bytes memory)
    {
        require(_length + 31 >= _length, "OVERFLOW");
        require(_bytes.length >= _start + _length, "OUT_OF_RANGE");
        bytes memory bytes_;
        assembly {
            switch iszero(_length)
            case 0 {
                bytes_ := mload(0x40)
                let lengthmod := and(_length, 31)
                let mc := add(add(bytes_, lengthmod), mul(0x20, iszero(lengthmod)))
                let end := add(mc, _length)
                for {
                    let cc := add(add(add(_bytes, lengthmod), mul(0x20, iszero(lengthmod))), _start)
                } lt(mc, end) {
                    mc := add(mc, 0x20)
                    cc := add(cc, 0x20)
                } {
                    mstore(mc, mload(cc))
                }
                mstore(bytes_, _length)
                mstore(0x40, and(add(mc, 31), not(31)))
            }
            default {
                bytes_ := mload(0x40)
                mstore(bytes_, 0)
                mstore(0x40, add(bytes_, 0x20))
            }
        }
        return bytes_;
    }
}