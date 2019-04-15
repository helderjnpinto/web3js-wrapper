var RLP = require('rlp')
var ethTx = require('ethereumjs-tx')
// var assert = require('assert')
 
var nestedList = [[], [[]], [[], [[]]]]

// var encoded = RLP.encode(nestedList)

var encoded = "0xf87404843b9aca008347b2588080a4d699c75000000000000000000000000000000000000000000000000000000000000000091ca024a5ce04c8af09483f11fd1bf87f14295f68dd5c6ff6536c5978bae62cf1f232a077cf559b842a75bb3fbb048c1e5d86b77ab15d";
console.log(`encoded: ${encoded}`);

var decoded = RLP.decode(encoded)

console.log(`decoded: ${decoded}`);

// assert.deepEqual(nestedList, decoded)
