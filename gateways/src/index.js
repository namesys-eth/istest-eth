import {
  Worker,
  isMainThread,
  parentPort,
  workerData
} from 'worker_threads';
import { URL } from 'url';
import { ethers } from 'ethers';
import 'isomorphic-fetch';
import { createRequire } from 'module';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
const require = createRequire(import.meta.url);
require('dotenv').config();
const crypto = require("crypto");
const express = require("express");
const key = process.env.PRIVATE_KEY;
const PORT = 3002
const app = express();
app.use(express.json());
app.use(cors({
	 origin: ['*'],
	headers: ['Content-Type']
}));
const options = {
	 key: fs.readFileSync('/root/.ssl/sshmatrix.club.key'),
	cert: fs.readFileSync('/root/.ssl/sshmatrix.club.crt')
};
const abi = ethers.utils.defaultAbiCoder;
function setHeader(cache) {
	return {
		'Allow': 'GET',
		'Access-Control-Allow-Origin': '*',
		'Content-Type': 'application/json',
		'Cache-Control': 'max-age=' + cache,
  }
}

app.get('/ping', async function (request, response) {
	response.end('istest-eth CCIP gateway is running on port ' + PORT + '\n');
});

app.get('/*', async function (request, response) {
  const env = process.env;
  const worker = new Worker('./src/worker.js', {
    workerData: {
         url: request.url,
         env: JSON.stringify(env)
    }
  });
  worker.on("message", res => {
    response.header(setHeader(JSON.parse(res).cache));
    response.status(JSON.parse(res).status);
    response.json({ data: JSON.parse(res).message }).end();
  });
  worker.on("error", error => {
    console.error(error);
    response.header(setHeader(6));
    response.status(405);
    response.json({ data: abi.encode(["uint256", "bytes", "bytes"], ['405', '0x0', '0x0']) }).end(); // 405: INTERNAL_ERROR
  });
  worker.on("exit", code => {});
});

console.log("istest-eth CCIP gateway is running on port " + PORT);
https.createServer(options,app).listen(PORT);
