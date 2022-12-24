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
const ensip10 = '9061b923';
const mainnet = new ethers.providers.AlchemyProvider("homestead", process.env.ALCHEMY_KEY_MAINNET);
const goerli  = new ethers.providers.AlchemyProvider("goerli", process.env.ALCHEMY_KEY_GOERLI);
const abi = ethers.utils.defaultAbiCoder;

async function handleCall() {

  let name = 'vitalik.istest1.eth';
	let selector = 'bc1c58d1';                                   // bytes4 of function to resolve e.g. resolver.contenthash() = bc1c58d1
	let namehash = ethers.utils.namehash(name);                  // namehash of 'vitalik.istest.eth'

  let calldata0 = '0x' + selector;
  let encoded   = '0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001407766974616c696b066973746573740365746800000000000000000000000000';                        // bytes DNSEncode('vitalik.istest.eth')

  console.log('>      name : ', name);
  console.log('>      node : ', namehash);
	let calldata1 = '0x' + selector + namehash.split('0x')[1];                     // eth_call: Resolver.contenthash(node)
  let calldata2 = '0x' + ensip10 + encoded + selector + namehash.split('0x')[1]; // eth_call: Resolver.resolve(DNSEncoded, (bytes4, node))
	let resolver  = chain == 'goerli' ? await goerli.getResolver(name) : await mainnet.getResolver(name);
  console.log('   resolver : ', resolver.address);
  //let content  = await resolver.getContentHash();
  //console.log('contenthash : ', content);
  
  let calldata_ = '0xc55a5d59000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000018543ca773b000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000415fe58a89f143ab9a39a79b0c6fb9daaf7c237e0b1c278d7f3740f797b24497840969dd1517be76601642d1a858476409bee188ed797ac4c70bf9f1aae2b944e81b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000026e3010170122081e99109634060bae2c1e3f359cda33b2232152b0e010baf6f592a39ca2288500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000007cff4fee6c4522aab0003e8d14cd40a6af439055fd2577951148c14b6cea9a5347583570e035aef437b29886ed22112173b38f7725015ef6d3d5e876b15637f369c4bb'
	const res = await fetch(rpc, {
		body: JSON.stringify({
			"jsonrpc": "2.0",
			 "method": "eth_call",
			 "params": [
				 {
					 "data": calldata2, //calldata0,1,2
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
		if (data.error) {
      //console.log(data);
      return {
				message: data.error.message.toUpperCase(),
				status: 400
			}
		}
    if (response === "0x") {
      return {
				message: 'BAD_RESULT',
				status: 401
			}
		}
    return {
      message: response,
      status: 200
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
