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
import fs from 'fs';
const require = createRequire(import.meta.url);
require('dotenv').config();
const crypto = require("crypto");
const abi = ethers.utils.defaultAbiCoder;

const worker = new Worker('./src/worker.js', {
  workerData: {}
});
worker.on("message", res => {
  console.log('Status :', JSON.parse(res).status);
  console.log('Result :', JSON.parse(res).message);
});
worker.on("error", error => {
  console.error(error);
});
worker.on("exit", code => {});
