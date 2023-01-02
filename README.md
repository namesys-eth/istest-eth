# `IsTest.eth` Developer Tool

Resolve your testnet ENS on mainnet (or vice-versa) with CCIP-Read.

# Description

`istest.eth` is a lightweight implementation of CCIP-Read 'Off-chain Lookup' that allows resolution of your testnet ENS name on mainnet. For example, users with an ENS name `name.eth` on a testnet (say Goerli) can now gaslessly resolve all records of `name.eth` on mainnet subdomain `name.istest.eth`. The testnet is mapped to mainnet by the CCIP-Read Resolver contract deployed on `istest.eth` mediated by a HTTP gateway. `istest.eth` is proof-of-concept of a contract that maps ENS records from one network to another. Naturally, the two participating networks can also be mainnet and an Ethereum L2 for example, or any pair of compatible networks. For instance, `istest.eth` has also been deployed on Goerli where it maps mainnet ENS records to testnet.

# Why `istest.eth`?

We realised the need of testnet → mainnet name resolution when building a subdomain-based community project. For instance, imagine a subdomain membership club built on `vitalik.eth` where subdomain holders can access their membership page at `nick.vitalik.eth` and interact with other members of the club through their subdomain page. Such an architecture will ideally consist of a common default contenthash deployment for all holders, with individual pages accessing the `window.location.href` property of subdomain hosts (i.e. `nick.vitalik.eth`) and rendering content accordingly. Testing such an architecture turned out to be an unecessary challenge since we couldn't resolve testnet contenthashes on ETH.LIMO gateway (since ETH.LIMO only supports mainnet). This led to the idea of a testnet → mainnet mapper which would allow us to resolve testnet contenthashes on ETH.LIMO for testing. Similar situation arose in another project where it was necessary to import the rich registry of ENS from mainnet to testnet for appropriate test environment recreation.

## Schema

`istest.eth` CCIP architecture has signtaure verification feature built in, meaning that all responses from the gateway are authenticated by the contract before resolving the requested name. The underlying resolver contract is fully modular, meaning anyone can 'blindly' fork their own version on mainnet and change configurations post hoc according to their needs. A summary of the workstream is as follows:

- Client makes a request to resolve `name.istest.eth` on mainnet
- Resolver initiates a CCIP-Read call to the gateway
- Gateway responds with signed records of `name.eth` on testnet
- Resolver collects gateway's response and verifies the signature
- If verified, `name.istest.eth` emits testnet records of `name.eth`

The schematic of the algorithm with Goerli as testnet is shown below:

![](https://raw.githubusercontent.com/bensyc/istest-eth/master/resources/schematic.png)

## Contracts

Testnet (Mainnet → Goerli): [`0x1EA6EFb27f4013D3A16E298a69C869C73CDB3479`](https://goerli.etherscan.io/address/0x1EA6EFb27f4013D3A16E298a69C869C73CDB3479#code)

Mainnet (Goerli → Mainnet): [`0x0Db7E56BFE3cbCD7B952F750c303CbF809585C6b`](https://etherscan.io/address/0x0Db7E56BFE3cbCD7B952F750c303CbF809585C6b#code)

## Source Codes

Node.js scripts for running multi-threaded gateways as well as source code for the contract are available on [GitHub](https://github.com/bensyc/istest-eth)

## Current State

There is currently [a bug in ethers.js](https://github.com/ethers-io/ethers.js/issues/3341) implementation in Node environment which is prohibiting contenthashes from getting mapped. This bug had previously been reported to ricmoo.eth & ETH.LIMO and fixed at that time, but it seems to have reappeared. We are in touch with ETH.LIMO about this issue and expect this to be resolved soon.
