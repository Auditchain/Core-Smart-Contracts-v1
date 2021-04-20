const timeMachine = require('ganache-time-traveler');


async function test() {
  let blockBefore = await web3.eth.getBlock();

  console.log("blockBefore:", blockBefore);

  for (var x = 1; x <= 100; ++x) {

    timeMachine.advanceBlock();
  }


  let blockAfter = await web3.eth.getBlock();

  console.log("blockAfter:", blockAfter);
}

test();