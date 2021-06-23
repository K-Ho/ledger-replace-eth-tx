'use strict';

require('dotenv-safe').config();

const { gray, green, red } = require('chalk');
const {
	Contract,
  providers: { JsonRpcProvider },
  Wallet,
  utils,
} = require('ethers');
const { LedgerSigner } = require('@ethersproject/hardware-wallets');
const { getContractInterface } = require('@eth-optimism/contracts')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const l2URL = process.env.L2_URL
const l1URL = process.env.L1_URL
const l2Provider = new JsonRpcProvider(l2URL)
const l1Provider = new JsonRpcProvider(l1URL)
const addressToWhitelist = process.env.ADDRESS_TO_WHITELIST
const USE_LEDGER = process.env.USE_LEDGER || false;
let l2Wallet
let l2WalletAddress

let l1Addresses = {}
let l2Addresses = {
  'OVM_ExecutionManager': '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0005',
  'OVM_L2CrossDomainMessenger': '0x4200000000000000000000000000000000000007',
  'OVM_DeployerWhitelist': '0x4200000000000000000000000000000000000002',
}

const loadContract = (name, isL2) => {
  return new Contract(isL2 ? l2Addresses[name] : l1Addresses[name], getContractInterface(name), isL2 ? l2Provider : l1Provider)
}

;(async () => {
  if (USE_LEDGER) {
    l2Wallet = new LedgerSigner(l2Provider, 'default', utils.defaultPath);
    console.log(l2Wallet)
    console.log('Connected to Ledger.')
    console.log('getting address?')
    l2WalletAddress = await l2Wallet.getAddress()
    console.log('got address?')
  } else  {
    if (typeof process.env.L2_USER_PRIVATE_KEY === 'undefined')
      throw new Error('Must pass whitelist owner key as L2_USER_PRIVATE_KEY');
    l2Wallet = new Wallet(process.env.L2_USER_PRIVATE_KEY, l2Provider);
    console.log('Connected to local l2 wallet.')
    l2WalletAddress = l2Wallet.address
  }
  console.log('connected to network', await l2Wallet.provider.getNetwork())
  console.log(gray('Current wallet address:'), green(l2WalletAddress))
  
  const deployerWhitelist  = loadContract('OVM_DeployerWhitelist', true)
  let whitelistOwner = await deployerWhitelist.owner()
  console.log('Whitelist Owner:', whitelistOwner)
  if (whitelistOwner === '0x0000000000000000000000000000000000000000') {
    console.log('Initializing Whitelist owner to:', l2WalletAddress)
    const txRes = await deployerWhitelist.connect(l2Wallet).initialize(l2WalletAddress, false, {gasPrice: 0})
    await txRes.wait()
    whitelistOwner = await deployerWhitelist.owner()
    console.log('initialized owner. tx hash:', txRes.hash)
    console.log('New Whitelist Owner:', whitelistOwner)
  }
  if (whitelistOwner !== l2WalletAddress){
    throw new Error(`Current l2 wallet address ${l2WalletAddress} is not the whitelist owner. Expected ${whitelistOwner}`)
  }
  
  // console.log('Whitelisting deployer address:', addressToWhitelist)
  // const txRes = await deployerWhitelist.connect(l2Wallet).setWhitelistedDeployer(addressToWhitelist, true, {gasPrice: 0})
  // await txRes.wait()
  // console.log('whitelisted', addressToWhitelist, '- Tx hash:', txRes.hash)
  // const isDeployerAllowed = await deployerWhitelist.callStatic.isDeployerAllowed(addressToWhitelist)
  // console.log('Is', addressToWhitelist, 'whitelisted?', isDeployerAllowed)

})()
