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

  // ETHERSJS Test
  //let content  = await resolver.getContentHash();
  //console.log('contenthash : ', content);

  // ETH_CALL Test
  let calldata_ = '0xc55a5d59000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000185449fd3e5000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000041c708810746b5e365ecd4e01046a10aaec272f5532337bbe43c2366dbb153f8ff33087c64e5034fdbcb16f6ab8efe7171108159880ca2eac6f9e03f526722a70c1c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000026e3010170122081e99109634060bae2c1e3f359cda33b2232152b0e010baf6f592a39ca2288500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000007d0314ee6c4522aab0003e8d14cd40a6af439055fd2577951148c14b6cea9a534758358342721d7cceb1b9274f859b13bff6ad0e152a5d478f87fad159f7e107b9e8b4'
	const res = await fetch(rpc, {
		body: JSON.stringify({
			"jsonrpc": "2.0",
			 "method": "eth_call",
			 "params": [
				 {
					 "data": calldata_, //calldata0,1,2
					 "to": '0x0fB454a6d9a09CEb2a8C23087222766392a22A08'
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
      console.log(data);
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
