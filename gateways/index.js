import {
  Worker,
  isMainThread,
  parentPort,
  workerData
} from 'worker_threads';
import { URL } from 'url';
import { AbiCoder } from 'ethers';
import 'isomorphic-fetch';
import { createRequire } from 'module';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
const require = createRequire(import.meta.url);
require('dotenv').config();
const crypto = require("crypto");
const express = require("express");
const process = require('process');
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
	cert: fs.readFileSync('/root/.ssl/sshmatrix.club.crt'),
    ca: fs.readFileSync('/root/.ssl/sshmatrix.club.ca-bundle')
};
const root = '/root/istest';
const abi = AbiCoder.defaultAbiCoder();
function setHeader(cache) {
	return {
		'Allow': 'GET',
		'Access-Control-Allow-Origin': '*',
		'Content-Type': 'application/json',
		'Cache-Control': 'max-age=' + cache,
  }
}

app.get('/ping', async function (request, response) {
  // sends opaque response with error code 200 since in-browser CORS is not enabled
  // response.header(setHeader(6)); // uncomment this to allow in-browser CORS
	response.end('istest-eth CCIP gateway is running in ' + root + ' on port ' + PORT + '\n');
});

app.get('/*', async function (request, response) {
  const env = process.env;
  const worker = new Worker(root + '/src/worker.js', {
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
    response.status(407); // 407: INTERNAL_ERROR
    response.json({ data: abi.encode(["uint64", "bytes", "bytes"], ['407', '0x', '0x']) }).end();
  });
  worker.on("exit", code => {});
});

console.log('istest-eth CCIP gateway is running in ' + root + ' on port ' + PORT);
https.createServer(options,app).listen(PORT);
