import {
	Worker,
	isMainThread,
	parentPort,
	workerData
} from 'worker_threads';
import { AlchemyProvider, AbiCoder, SigningKey } from 'ethers';
import 'isomorphic-fetch';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
//const { SigningKey } = require("@ethersproject/signing-key")
const { keccak256 } = require("@ethersproject/solidity")
//const { defaultAbiCoder } = require("@ethersproject/abi");

const chains = {
	"ethereum": [
		"https://rpc.ankr.com/eth",
		"https://eth-rpc.gateway.pokt.network",
		`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_MAINNET}`
	],
	"gnosis": ["https://rpc.ankr.com/gnosis"],
	"polygon": ["https://rpc.ankr.com/polygon"],
	"arbitrum": ["https://rpc.ankr.com/arbitrum"],
	"goerli": [
		"https://rpc.ankr.com/eth_goerli",
		`https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_GOERLI}`
	]
};
const ttl = 600;
const headers = {
	"Allow": "GET",
	"Content-Type": "application/json",
	"Access-Control-Allow-Origin": "*"
};

const mainnet = new AlchemyProvider("homestead", process.env.ALCHEMY_KEY_MAINNET);
const goerli = new AlchemyProvider("goerli", process.env.ALCHEMY_KEY_GOERLI)

// bytes4 of hash of ENSIP-10 'resolve()' identifier
const ensip10 = '0x9061b923';
let CCIP_RESOLVER;
let provider;
const abi = AbiCoder.defaultAbiCoder();

async function handleCall(url, env) {
	const pathname = url;
	let paths = pathname.toLowerCase().split('/');
	/* debug
	console.log(paths.length);
	*/
	if (paths.length != 4) {
		return {
			message: abi.encode(["uint64", "bytes", "bytes"], ['400', '0x', '0x']), // 400: BAD_QUERY
			status: 400,
			cache: 6
		}
	}
	if (!['1', '5'].includes(paths[1].split(':')[1])) {
		return {
			message: abi.encode(["uint64", "bytes", "bytes"], ['401', '0x', '0x']), // 401: BAD_GATEWAY
			status: 401,
			cache: 6
		}
	}
	// set chains here
	let chain = chains[paths[1].split(':')[1] == '5' ? 'goerli' : 'ethereum'][0];
	if (paths[1].split(':')[1] === '5') {
		provider = goerli;
		CCIP_RESOLVER = process.env.CCIP_MAINNET;
	} else {
		provider = mainnet;
		CCIP_RESOLVER = process.env.CCIP_GOERLI;
	}
	let name = paths[2];
	let selector = paths[3].split('0x')[1].slice(0, 8); // bytes4 of function to resolve e.g. resolver.contenthash() = bc1c58d1
	let namehash = paths[3].split('0x')[1].slice(8, 72); // namehash of 'vitalik.eth' = 05a67c0ee82964c4f7394cdd47fee7f4d9503a23c09c38341779ea012afe6e00
	let extradata = paths[3].split('0x')[1].slice(72,); // extradata for resolver.contenthash() =
	if (selector == '') {
		return {
			message: abi.encode(["uint64", "bytes", "bytes"], ['402', '0x', '0x']), // 402: BAD_INTERFACE
			status: 402,
			cache: 7
		}
	}
	let calldata = paths[3];
	let resolver = await provider.getResolver(name);

	const res = await fetch(chain, {
		body: JSON.stringify({
			"jsonrpc": "2.0",
			"method": "eth_call",
			"params": [
				{
					"data": calldata,
					"to": resolver.address
				},
				"latest"
			],
			"id": Date.now()
		}),
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		cf: {
			cacheTtl: 6
		},
	});

	let { headers } = res;
	let contentType = headers.get('content-type') || '';

	if (contentType.includes('application/json')) {
		let data = await res.json();
		let response = data.result ? data.result : '0x';
		let { digest, signature, validity } = await Sign(resolver.address, response, namehash, env);
		if (data.error) {
			return {
				message: abi.encode(["uint64", "bytes", "bytes"], ['405', '0x', '0x']),
				status: 405,																													// 405: BAD_RESULT
				cache: 6
			}
		}
		if (response === "0x") {
			return {
				message: abi.encode(["uint64", "bytes", "bytes"], ['403', '0x', '0x']),
				status: 403,																													// 403: BAD_RESULT
				cache: 6
			}
		}

		return {
			message: abi.encode(["uint64", "bytes", "bytes"], [validity, signature, response]),
			status: 200,																														// 200: SUCCESS
			cache: 666
		}
	} else {
		return {
			message: abi.encode(["uint64", "bytes", "bytes"], ['502', '0x', '0x']), // 502: BAD_HEADER
			status: 502,
			cache: 7
		}
	}
};

async function Sign(resolver, response, namehash, env) {
	if (!env.PRIVATE_KEY) {
		return {
			message: abi.encode(["uint64", "bytes", "bytes"], ['500', '0x', '0x']), // 500: BAD_SIGNATURE
			status: 500,
			cache: 6
		}
	}

	let validity = ((Date.now() / 1000) | 0) + 60 // TTL: 60 seconds

	/* debug
	let validity = 16724062870
	console.log('<namehash>:', `0x${namehash}`);
	console.log('<response>:', response);
	console.log('<validity>:', validity);
	console.log('<CCIP_RESOLVER>:', CCIP_RESOLVER);
	*/

	let signer = new SigningKey(env.PRIVATE_KEY.slice(0, 2) === "0x" ? env.PRIVATE_KEY : "0x" + env.PRIVATE_KEY);
	let digest;
	try {
		digest = keccak256(
			["bytes2", "address", "uint64", "bytes32", "bytes"],
			['0x1900', CCIP_RESOLVER, validity, `0x${namehash}`, response]
		);
	} catch (e) {
		return {
			message: abi.encode(["uint64", "bytes", "bytes"], ['406', '0x', '0x']), // 406: BAD_NAMEHASH
			status: 406,
			cache: 6
		}
	}
	/* debug
	console.log('digest:', digest);
	console.log(`0x${namehash}`, response, validity, CCIP_RESOLVER, digest);
	*/
	let signedDigest = signer.sign(digest);
	const signature = signedDigest.compactSerialized;
	/* debug
	console.log('signature', signature); // test
	*/
	
	console.log('------------------')
	console.log('ETH_CALL  : ', response);
	console.log('Resolver  : ', resolver);
	console.log('CCIP      : ', CCIP_RESOLVER);
	console.log('Signature : ', signature);
	console.log('Digest    : ', digest);
	console.log('Validity  : ', validity);
	console.log('Response  : ', abi.encode(["uint64", "bytes", "bytes"], [validity, signature, response]));
	console.log('------------------')

	return { digest, signature, validity }
}

const url = workerData.url;
const env = JSON.parse(workerData.env);
const _response = await handleCall(url, env);
let callback = _response;
parentPort.postMessage(JSON.stringify(callback));
