import {
  Worker,
  isMainThread,
  parentPort,
  workerData
} from 'worker_threads';
import { ethers } from 'ethers';
import 'isomorphic-fetch';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

const chains = {
	"ethereum": [
		"https://rpc.ankr.com/eth",
		"https://eth-rpc.gateway.pokt.network",
		`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_MAINNET}`
	],
	"gnosis":   [ "https://rpc.ankr.com/gnosis"  ],
	"polygon":  [ "https://rpc.ankr.com/polygon"  ],
	"arbitrum": [ "https://rpc.ankr.com/arbitrum"  ],
	"goerli":   [
		"https://rpc.ankr.com/eth_goerli",
		`https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_GOERLI}`
	]
};

// bytes4 of hash of ENSIP-10 'resolve()' identifier
const chain = 'goerli'
const rpc = chains[chain][0];
const ensip10 = '9061b923';
const mainnet = new ethers.providers.AlchemyProvider("homestead", process.env.ALCHEMY_KEY_MAINNET);
const goerli  = new ethers.providers.AlchemyProvider("goerli", process.env.ALCHEMY_KEY_GOERLI);
const abi = ethers.utils.defaultAbiCoder;

async function handleCall() {

	let name = 'istest1.eth';
	let selector = 'bc1c58d1';                                 // bytes4 of function to resolve e.g. resolver.contenthash() = bc1c58d1
	let namehash = ethers.utils.namehash('nick.istest1.eth');  // namehash of 'nick.istest1.eth'
  let encoded = '046e69636b07697374657374310365746800';      // bytes DNSEncode('nick.istest1.eth')
  console.log('       node : ', namehash);
	let calldata = '0x' + selector + namehash;
  let resolve  = '0x' + ensip10 + encoded + selector + namehash;
	let resolver = chain == 'goerli' ? await goerli.getResolver(name) : await mainnet.getResolver(name);
  console.log('   resolver : ', resolver.address);
  //let content  = await resolver.getContentHash();
  //console.log('contenthash : ', content);
	const res = await fetch(rpc, {
		body: JSON.stringify({
			"jsonrpc": "2.0",
			 "method": "eth_call",
			 "params": [
				 {
					 "data": resolve,
					 "to": resolver.address
				 },
				 "latest"
			 ],
			 "id": chain == 'goerli' ? 5 : 1
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
		let response = data.result ? data.result.toString() : '0x';

		if (data.error || response === "0x") {
      return {
				message: 'BAD_RESULT',
				status: 400
			}
		}
    return {
      message: response,
      status: 401
    }

	} else {
    return {
      message: 'BAD_RESPONSE',
      status: 402
    }
	}
};

const res = await handleCall();
let callback  = await res;
parentPort.postMessage(JSON.stringify(callback));
