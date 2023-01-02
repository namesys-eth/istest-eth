require('dotenv').config();
const express = require("express")
const cors = require("cors")
const app = express()
app.use(cors({
	origin: '*'
}));
const {
	SigningKey
} = require("@ethersproject/signing-key")
const {
	keccak256
} = require("@ethersproject/solidity")
const {
	defaultAbiCoder
} = require("@ethersproject/abi");
const ZERO_BYTES32 = "0x".padEnd(66, "0")
const ENS_ADDR = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
const CCIP_RESOLVER = "0xa0e6dDAA27EeA7D93a437A44C2aaE32315d052a2"
app.get('/', (req, res) => {
	getResolver(1, "vitalik.eth").then((result) => {
		res.send(result ? result : "ERROR _")
	})
})

const CHAINS = {
	"1": [
		"https://rpc.ankr.com/eth",
		"https://eth-rpc.gateway.pokt.network",
		//`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_MAINNET}`
	],
	"gnosis": ["https://rpc.ankr.com/gnosis"],
	"polygon": ["https://rpc.ankr.com/polygon"],
	"arbitrum": ["https://rpc.ankr.com/arbitrum"],
	"5": [
		"https://rpc.ankr.com/eth_goerli",
		"https://goerli.infura.io/v3/" + process.env.INFURA_KEY
		//`https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_GOERLI}`
	]
}

async function Namehash(name) {
	console.log(name)
	let _n = (name).split(".")
	let i = _n.length
	let hash = keccak256(
		["bytes32", "bytes32"],
		["0x".padEnd(66, "0"),
			keccak256(
				["string"],
				[_n[--i]]
			)
		]
	)
	while (i > 0) {
		hash = keccak256(
			["bytes32", "bytes32"],
			[hash,
				keccak256(
					["string"],
					[_n[--i]]
				)
			]
		)
	}
	return hash
}
async function getResolver(chain, name, ccip) {
	//let api = CHAINS[chain][0]
	ccip = ccip ? true : false
	let _cd = await Namehash(name)
	_cd = "0x0178b8bf" + _cd.slice(2, ) //resolver() function
	return rpcFetch(chain, ENS_ADDR, _cd)
		.then((data) => {
			if (!data || data.error) {
				throw Error("(" + data.error.code + ") " + data.error.message)
			} else if (data.result == "0x" || data.result == ZERO_BYTES32) {
				let _name = name.split(".")
				if (_name.length > 2 && ccip) {
					_name.shift()
					return getResolver(chain, _name.join("."), true)
				}
				throw Error("Resolver Not Found")
			}
			return {
				"ccip": ccip,
				"address": "0x" + data.result.slice(26, 66)
			}
		}).catch(console.error)
}
async function rpcFetch(chain, addr, data) {
	console.log(chain, addr, data)
	return fetch(CHAINS[chain][0], {
		body: JSON.stringify({
			"jsonrpc": "2.0",
			"method": "eth_call",
			"params": [{
				"to": addr,
				"data": data
			}, "latest"],
			"id": Date.now()
		}),
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		}
	}).then((res) => {
		if (res && res.ok) {
			let contentType = res.headers.get('content-type') || ''
			if (contentType.includes('application/json')) {
				return res.json()
			}
		}
		return {
			error: {
				code: res.status,
				message: res.statusText ? res.statusText : "Expected JSON Content"
			}
		}
	}).catch(console.error)
}
app.get('/:chain/:name/:callData', async (req, res) => {
	let {
		chain,
		name,
		callData
	} = req.params
	chain = chain.split(":")[1]
	let _namehash = "0x" + callData.slice(10, 74)
	if (Number(chain) && CHAINS[chain][0]) {
		let _resolver = await getResolver(chain, name)
		rpcFetch(chain, _resolver.address, callData).then((data) => {
			if (data && data.result) {
				let _validity = ((Date.now() / 1000) | 0) + 60
				//let _validity = 16724062870 // test
				//console.log('namehash', _namehash); // test
				//console.log('result', data.result); // test
				//console.log('resolver', _resolver.address); // test
				//console.log('ccip', CCIP_RESOLVER); // test
				let digest = keccak256(
					["bytes2", "address", "uint64", "bytes32", "bytes"],
					["0x1900", CCIP_RESOLVER, _validity, _namehash, data.result]
				)
				//console.log('digest', digest); // test
				let signer = new SigningKey(process.env.SKEY)
				//console.log('signature', signer.signDigest(digest).compact); // test
				res.json({
					data: defaultAbiCoder.encode(
						["uint64", "bytes", "bytes"],
						[_validity, signer.signDigest(digest).compact, data.result])
				})
			} else {
				res.status(401).json({
					error: "Invalid EIP155 Chain ID"
				})
			}
		}).catch((e) => {
			console.log("X2", e)
		})
	} else {
		res.status(401).json({
			"error": "Invalid EIP155 Chain ID"
		})
	}
})

app.listen(3003, () => {
	console.log(`CCIP Gateway listening on port 3003`)
})


module.exports = app;
