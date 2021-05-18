const timeMachine = require('ganache-time-traveler');


async function test() {
  let blockBefore = await web3.eth.getBlock();

  console.log("blockBefore:", blockBefore);

  // for (var x = 1; x <= 100; ++x) {

  //   timeMachine.advanceBlock();
  // }


  let blockAfter = await web3.eth.getBlock();

  // console.log("blockAfter:", blockAfter);

  console.log(web3.utils.keccak256("0x0000000000000000000000000000000000000000000000000000000000000000"));
  console.log(web3.utils.keccak256("CONTROLLER_ROLE"));


}

test();