// this module will wrap web3 contract and add new .send parameter
// use this as function wrapper to fix specific options to that function’s invocation
var Wrapper = Proxy;
var TransactionX = require('./custom-eth-tx/es5');
var axios = require('axios');

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const retrievePkFromWallet = function (from) {
	const pkFromWallet = this.wallet.wallets[from].getPrivateKeyString().slice(2);
	return Buffer.from(pkFromWallet, 'hex');
};

const promisify = (inner) =>
	new Promise((resolve, reject) =>
		inner((err, res) => {
			if (err) {
				reject(err);
			}
			resolve(res);
		})
	);

const generatePayload = (method, params) => {
	return {
		jsonrpc: '2.0',
		method,
		params,
		id: getRandomInt(1, 1000)
	}
}

const sendRequest = (url, data, cb) => {
	axios
		.post(url, data)
		.then(function (res) {
			cb(null, res.data);
		})
		.catch(function (error) {
			cb(error, null);
		});
}

const waitForReceipt = function ({
	hash,
	providerHttp,
	cb
}) {
	const payload = generatePayload('eth_getTransactionReceipt', [hash])

	axios
		.post(providerHttp, payload)
		.then((res) => {
			if (res.data !== null) {
				if (cb) {
					cb(null, res.data);
				}
			} else {
				// Try again in 1 second
				const timerObj = setTimeout(() => {
					waitForReceipt({
						hash,
						cb
					});
				}, 1000);
				timerObj.unref();
			}
		})
		.catch(function (error) {
			cb(error, null);
		})
}

const ContractMixin = function (contract, eth) {
	let co = Object.assign(contract, {
		_eth: eth
	});
	let coHandler = {
		apply: function (co, thisArg, argumentsList) {
			return co(...argumentsList);
		},
		construct(contract, args) {
			let newContract = contract(...args);
			newContract = Object.assign(newContract, {
				_eth: contract._eth
			});
			return new Wrapper(newContract, {
				get: (tco, keyProp) => {
					if (keyProp === 'methods') {
						return new Wrapper(
							Object.assign(tco, {
								_methods: tco.methods
							}), {
								get: (t, k) => {
									const {
										_methods,
										_eth,
										_contract
									} = t;
									return function () {
										let that = this;
										const scm = t.methods[k].apply(t.methods, arguments);
										const _send = async function (argsSend, callbackSend) {
											if (!("currency" in {
													...argsSend
												})) {
												scm.send.call(this);
											} else {
												const txParams = {
													to: args[1],
													data: scm.encodeABI(),
													...args[2],
													...argsSend
												};
												const signTransaction = await promisify((cb) =>
													_eth.signTransaction(txParams, cb)
												);
												const providerHttp = function () {
													let provider = _eth.currentProvider;
													if (provider.host === 'CustomProvider') {
														// truffle hd wallet
														return provider.connection.engine._providers[3].provider.host;
													} else {
														// native web3 provider
														return provider.host;
													}
												}.apply(this);
												const resultSendSignedTx = await promisify((pcb) => {
													// _eth.sendSignedTransaction(signTransaction.raw, cb)
													const payload = generatePayload('eth_sendRawTransaction', [signTransaction.raw]);
													sendRequest(providerHttp, payload, pcb);
												});
												const that = this;
												const waitReceipt = await promisify((cb) => {
													waitForReceipt.call(that, {
														hash: resultSendSignedTx.result,
														providerHttp,
														cb
													})
												});
												return waitReceipt;
											}
										}.bind({
											t,
											k,
											scm,
											that
										});
										scm.send = _send;
										return scm;
									};
								}
							}
						);
					}
					if (keyProp in tco) {
						return tco[keyProp];
					}
				}
			});
		},
		get: function (co, name) {
			return co[name];
		}
	};
	return new Wrapper(co, coHandler);
};

const web3Wrapper = function (web3Instance) {
	let newWeb3Instance = Object.assign(web3Instance, {
		eth: Object.assign(web3Instance.eth, {
			Contract: ContractMixin(web3Instance.eth.Contract, web3Instance.eth)
		})
	});
	return newWeb3Instance;
};

const HDWalletProviderWrapper = function (hdWallet) {
	const signTransactionMixin = function (txParams, cb) {
		let pkey;
		const from = txParams.from.toLowerCase();
		const tmp_wallets = this.wallets;
		if (tmp_wallets[from]) {
			pkey = tmp_wallets[from].getPrivateKey();
		} else {
			cb('Account not found');
		}
		const tx = new TransactionX(txParams);
		tx.sign(pkey);
		const rawTx = '0x' + tx.serialize().toString('hex');
		cb(null, rawTx);
	};
	hdWallet.engine._providers[0].signTransaction = signTransactionMixin.bind(hdWallet);
	return hdWallet;
};

module.exports = {
	web3Wrapper,
	HDWalletProviderWrapper
};

// export as default 
export default web3Wrapper;
