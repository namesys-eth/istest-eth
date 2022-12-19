import {
  Worker,
  isMainThread,
  parentPort,
  workerData
} from 'worker_threads';
import { ethers } from 'ethers';
import 'isomorphic-fetch';

const chains = {
	"ethereum": [
								"https://rpc.ankr.com/eth",
								"https://eth-rpc.gateway.pokt.network"
							],
	"gnosis":   [ "https://rpc.ankr.com/gnosis"  ],
	"polygon":  [ "https://rpc.ankr.com/polygon"  ],
	"arbitrum": [ "https://rpc.ankr.com/arbitrum"  ],
	"goerli":   [ "https://rpc.ankr.com/eth_goerli" ]
};
const	ttl = 600;
const	headers = {
	"Allow": "GET",
	"Content-Type": "application/json",
	"Access-Control-Allow-Origin": "*"
};

async function handleCall(url, env) {
	const pathname = url;
	let paths = pathname.toLowerCase().split("/");
	if (paths.length != 4) {
		return {
			message: 'BAD_REQUEST',
			status: 400,
			cache: 6
		}
	}
	if (!chains[paths[1]]) {
		return {
			message: 'BAD_NETWORK',
			status: 400,
			cache: 6
		}
	}
	const api = chains[paths[1]][0];
	const res = await fetch(api, {
		body: JSON.stringify({
			"jsonrpc": "2.0",
			 "method": "eth_call",
			 "params": [
									{
										"data": paths[3],
				  					  "to": paths[2]
									},
									"latest"
								],
			     "id": 42
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
	if ( contentType.includes('application/json') ) {
		let data = await res.json();
		if (data.error || data.result === "0x") {
			return {
				message: 'BAD_RESPONSE',
				status: 400,
				cache: 6
			}
		}
		return {
			message: data.result,
			status: 200,
			cache: 666
		}
	} else {
		return {
			message: 'BAD_GATEWAY',
			status: 502,
			cache: 7
		}
	}
};

const url = workerData.url;
const env = JSON.parse(workerData.env);

const res = await handleCall(url, env);
let response  = await res;
parentPort.postMessage(JSON.stringify(response));
