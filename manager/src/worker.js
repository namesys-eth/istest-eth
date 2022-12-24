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


const infura = new ethers.providers.InfuraProvider(
  "goerli",
  {
    projectId: "e27598cddfe84af8aaef15689dd5a556",
  }
);

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
const ensip10 = '0x9061b923';
const mainnet = new ethers.providers.AlchemyProvider("homestead", process.env.ALCHEMY_KEY_MAINNET);
const goerli  = new ethers.providers.AlchemyProvider("goerli", process.env.ALCHEMY_KEY_GOERLI);
const abi = ethers.utils.defaultAbiCoder;

async function handleCall() {

  let name = 'vitalik.istest1.eth';
	let selector = 'bc1c58d1';                                   // bytes4 of function to resolve e.g. resolver.contenthash() = bc1c58d1
	let namehash = ethers.utils.namehash(name);                  // namehash of 'nick.istest.eth'

  let calldata0 = '0x' + selector;
  let encoded   = '00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000012046e69636b076973746573743103657468000000000000000000000000000000';                        // bytes DNSEncode('nick.istest.eth')

  console.log('>      node : ', namehash);
  // console.log('    ALCHEMY ----------')
	let calldata1 = '0x' + selector + namehash.split('0x')[1];                     // eth_call: Resolver.contenthash(node)
  let calldata2 = '0x' + ensip10 + encoded + selector + namehash.split('0x')[1]; // eth_call: Resolver.resolve(DNSEncoded, (bytes4, node))
	let resolver  = chain == 'goerli' ? await goerli.getResolver(name) : await mainnet.getResolver(name);
  console.log('   resolver : ', resolver.address);
  let content  = await resolver.getContentHash();
  console.log('contenthash : ', content);
  console.log('----------------------')
  // Infura Test
  // let resolver2 = await infura.getResolver("vitalik.istest.eth");
  // console.log('    INFURA -----------')
  // resolver2.getAddress().then(console.log);
  // resolver2.getContentHash().then(console.log);
  // console.log('----------------------')
  // ------

	const res = await fetch(rpc, {
		body: JSON.stringify({
			"jsonrpc": "2.0",
			 "method": "eth_call",
			 "params": [
				 {
					 "data": calldata0, //calldata0,1,2
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
      status: 200
    }

	} else {
    return {
      message: 'BAD_RESPONSE',
      status: 401
    }
	}
};

const res = await handleCall();
let callback  = await res;
parentPort.postMessage(JSON.stringify(callback));
