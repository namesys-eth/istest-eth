import {
  Worker,
  isMainThread,
  parentPort,
  workerData
} from 'worker_threads';
import { URL } from 'url';
import {
  Prompt,
  Output,
  Signed,
  fetch,
  handleRequest
} from './worker.js';
import { createRequire } from 'module';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
const require = createRequire(import.meta.url);
require('dotenv').config();
const crypto = require("crypto");
const express = require("express");

if (isMainThread) {
    const key = process.env.PRIVATE_KEY;
    const PORT = 3002
    const app = express();
    app.use(express.json());
    app.use(cors({
    	 origin: [
        				'*',
        			 ],
    	headers: [
    				    'Content-Type',
    					 ],
    }));
    const options = {
    	 key: fs.readFileSync('/root/.ssl/sshmatrix.club.key'),
    	cert: fs.readFileSync('/root/.ssl/sshmatrix.club.crt')
    };

    console.log("Hello World!");
    app.get('/ping', async function (request, response) {
    	response.end('CCIP gateway is running on port ' + PORT + '\n');
    });

    const __filename = new URL('', import.meta.url).pathname;
    const worker = new Worker(__filename, { workerData: "Check" });
    worker.on("message", msg => console.log(`Worker message received: ${msg}`));
    worker.on("error",   err => console.error(err));
    worker.on("exit",   code => console.log(`Worker exited with code: ${code}.`));
    console.log("istest-eth server is listening on port " + PORT);
    https.createServer(options,app).listen(PORT);
} else {
    let prompt = workerData;
    const data = Prompt(prompt);
    parentPort.postMessage(`\"${data}\"`);
}
