'use strict';

require('dotenv-safe').config();

const { gray, green, red } = require('chalk');
const {
  providers: { JsonRpcProvider },
  Wallet,
  utils,
} = require('ethers');
const { LedgerSigner } = require('@ethersproject/hardware-wallets');

const l2URL = process.env.L2_URL
const l2Provider = new JsonRpcProvider(l2URL)
const USE_LEDGER = process.env.USE_LEDGER || false;
let l2Wallet
let l2WalletAddress

;(async () => {
  if (USE_LEDGER) {
    l2Wallet = new LedgerSigner(l2Provider, 'default', utils.defaultPath);
    console.log(l2Wallet)
    console.log('Connected to Ledger.')
    l2WalletAddress = await l2Wallet.getAddress()
  } else  {
    if (typeof process.env.L2_USER_PRIVATE_KEY === 'undefined')
      throw new Error('Must pass whitelist owner key as L2_USER_PRIVATE_KEY');
    l2Wallet = new Wallet(process.env.L2_USER_PRIVATE_KEY, l2Provider);
    console.log('Connected to local l2 wallet.')
    l2WalletAddress = l2Wallet.address
  }
  console.log('connected to network', await l2Wallet.provider.getNetwork())
  console.log(gray('Current wallet address:'), green(l2WalletAddress))
  let tx = {
    to: `0x${'00'.repeat(20)}`,
    value: 0,
    nonce: 11,
    gasPrice: 175000000000 //175 gwei
  }
  const receipt = await l2Wallet.sendTransaction(tx)
  console.log(receipt)
})()
