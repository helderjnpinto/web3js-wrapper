var RLP = require('rlp');
var ethTx = require('./custom-eth-tx/');
var Web3 = require('web3');
var StorageArtifacts = require("./SetStorage.json");
var storageAbi = StorageArtifacts.abi;
var HDWalletProvider = require("truffle-hdwallet-provider");
const MNEMONIC = "about hair goose output senior short stone decade lock loop kidney beach";

const promisify = (inner) =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) {
        reject(err)
      }
      resolve(res);
    })
  );

const {
  web3Wrapper,
  HDWalletProviderWrapper
} = require("./web3.wrapper");

(async function () {
  console.log('Hello World of RLP !');

  const walletProvider = new HDWalletProvider(MNEMONIC, 'http://localhost:8545', 0, 20);
  // wrapp engine
  const walletProviderx = HDWalletProviderWrapper(walletProvider);

  // console.log("TCL: walletProviderx", walletProviderx.send());

  // const web3s = new Web3('http://localhost:8545');
  const web3 = new Web3(walletProviderx);
  const web3x = web3Wrapper(web3);

  const fromAddress = '0x8717eD44cEB53f15dB9CF1bEc75a037A70232AC8';

  const commonOpts = {
    gasPrice: '0x3B9ACA00',
    gasLimit: '0x300000',
    from: fromAddress
  }

  const myNonce = await web3.eth.getTransactionCount(fromAddress);
  console.log(`\n\n\ \t[Info] My address nonce ${myNonce} in hex: ${ web3.utils.toHex(myNonce) }`);

  const storageAddress = "0xad122877800f911864Ae8b1992693BC78470FC48";
  console.log("\n\n\ \t[Info] StorageAddress: ", storageAddress)
  var storageInstance = new web3x.eth.Contract(storageAbi, storageAddress, commonOpts);

  const dataToChange = storageInstance.methods.setStorage(myNonce).encodeABI();
  console.log("\n\n \t-> DataToChange", dataToChange)

  const currencySymbol = web3.utils.utf8ToHex('USDP');
  console.log("\n\n \t-> currencySymbol - 'USDP' ", currencySymbol)

  const txDefaultGas = {
    gasPrice: '0x3B9ACA00',
    gasLimit: '0x300000'
  }

  const txParams = {
    // nonce: web3.utils.toHex(myNonce), // Replace by nonce for your account on geth node
    ...txDefaultGas,
    to: storageAddress,
    data: dataToChange, // '0xd699c7500000000000000000000000000000000000000000000000000000000000000001'
    value: '0x0'
  };

  // Transaction is created
  const transactionObjCurrency = {
    ...txParams,
    currency: currencySymbol
  }
  const tx = new ethTx(transactionObjCurrency);
  // Transaction is signed
  tx.sign(Buffer.from("dde94897e9e4f787f6360552a4a723d06b0c730da77c30ce2d4cda61f94e187f", 'hex'));
  const serializedTx = tx.serialize();
  const rawTx = '0x' + serializedTx.toString('hex');

  console.log("\n\t :: Send RLP")
  console.log('\n\n \t\t -> RLP: ', rawTx)

  const transactionObjSignWeb3 = {
    from: fromAddress,
    ...txParams,
    currency: currencySymbol
  }

  // const signTransaction = await promisify(cb => web3.eth.signTransaction(transactionObjSignWeb3, cb));
  // console.log("TCL: signTransaction", signTransaction)

  // const resultSendSignedTx = await promisify(cb => web3s.eth.sendSignedTransaction(signTransaction.raw, cb));
  // console.log("\n\n \t\t-> Result SendSignedTx: ", resultSendSignedTx)

  let receiptSet;
  receiptSet = await storageInstance.methods.setStorage(myNonce).send({
    currency: currencySymbol
  });

  // receiptSet = await storageInstance.methodsx.setStorage(myNonce).send({
  //   from: fromAddress,
  //   ...txDefaultGas,
  //   currency: currencySymbol
  // })
  console.log("TCL: receiptSet", receiptSet)

  // check value on storage contract 
  console.log("\n\t :: Check value on storage contract")

  let counterValue;
  let i = 0;

  while (i < 10) {
    i++;
    counterValue = await promisify(cb => {
      const obj = setTimeout(() => {
        storageInstance.methods.counter().call(commonOpts, cb)
      }, 250)
      setImmediate(() => {
        obj.unref();
      })
    });
    console.log("\n\n \t\t-> counterValue: ", counterValue)
  }

  walletProvider.engine.stop();
})();
