import { ethers } from 'ethers';
import 'isomorphic-fetch';
import { URL } from 'url';

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

async function fetch(request, env) {
	return this.handleRequest(request, env).catch(
		(err) => {
			return this.Output(err.stack, 500, 33)
		}
	)
};

async function handleRequest(request, env) {
	if (request.method !== 'GET') return this.Output(`Method ${request.method} Not Allowed`.toUpperCase(), 405, 6);
	const { pathname } = new URL(request.url);
	console.log("REQUEST", JSON.stringify(request.url));
	let paths = pathname.toLowerCase().split("/");
	if (paths.length < 4 || paths.length > 5) {
		return this.Output("Bad Request".toUpperCase(), 400, 6)
	}
	if (!this.chains[paths[1]]) {
		return this.Output(`${paths[1]} Network Not Supported`.toUpperCase(), 400, 6);
	}
	const api = this.chains[paths[1]][0];
	console.log("API", api, JSON.stringify(paths));
	const response = await fetch(api, {
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
	let { headers } = response;
	let contentType = headers.get('content-type') || '';
	if ( contentType.includes('application/json') ) {
		let res = await response.json();
		console.log("RESULT", res.result);
		if (res.error || res.result === "0x") {
			return this.Output(res.error ? res.error.message : "Bad Request".toUpperCase(), 400, 6)
		}
		return this.Output(res.result, 200, 666);
	} else {
		return this.Output("Bad Gateway".toUpperCase(), 502, 7);
	}
};

function Signed(result, calldata, env) {
	if (!env.PRIVATE_KEY) {
		return this.Output('Private Key Not Set'.toUpperCase(), 500, 6);
	}
	let signer = new ethers.utils.SigningKey(env.PRIVATE_KEY.slice(0, 2) === "0x" ? env.PRIVATE_KEY : "0x" + env.PRIVATE_KEY);
	let abi = new ethers.utils.AbiCoder();
	abi.encode();
	return this.Output(result, 200, 666);
};

function Output(result, status, cache) {
	return new Response(
		status == 200 ? `{ "data": "${result}" }` : `{ "error": "${result}" }`, {
			status: status,
			headers: {
				'Allow': 'GET',
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
				'Cache-Control': 'max-age=' + cache,
			}
		}
	)
};

function Prompt(arg) {
	let abi = new ethers.utils.AbiCoder();
	return `${arg} Passed`;
};

export { Prompt, Output, Signed, fetch, handleRequest };

/**
let digest = solidityKeccak256(
							['bytes', 'address', 'uint64', 'bytes32', 'bytes32'],
							['0x1900']
						)
**/
