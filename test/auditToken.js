const util = require('util')

const TOKEN = artifacts.require('../AuditToken');
const MIGRATION_AGENT = artifacts.require('../MigrationAgentMock');

import {
    ensureException,
    duration
} from './helpers/utils.js';

import {
    increaseTime,
    takeSnapshot,
    revertToSnapshot
} from './helpers/time.js'
// import { assert } from 'console';
// import { assert } from 'console';

//import should from 'should';

var BigNumber = require('big-number');

//var ensureException = require("./helpers/utils.js");
//const BigNumber = require('bignumber.js');



contract("ERC20 Auditchain Token", (accounts) => {
    let owner;
    let holder1;
    let holder2;
    let holder3;
    let holder4;
    let supply = (250000000) * 1e18;
    let transferFunds = 1000;
    let allowedAmount = 200;
    let initialSupply = new BigNumber(250000000).mult(1e18);
    let oneYearSupply = new BigNumber(12500000).mult(1e18);
    let token;
    let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
    let DEFAULT_ADMIN_ROLE = "0x00";

    before(async () => {
        owner = accounts[0];
        holder1 = accounts[1];
        holder2 = accounts[2];
        holder3 = accounts[3];
        holder4 = accounts[4];

    });

    beforeEach(async () => {

        token = await TOKEN.new(owner);
        await token.transfer(holder1, transferFunds, {
            from: owner
        });

        await token.grantRole(CONTROLLER_ROLE, owner, { from: owner });


    })
    describe("Constructor", async () => {
        it("Verify constructors", async () => {

            token = await TOKEN.new(owner);

            let tokenName = await token.name.call();
            assert.equal(tokenName.toString(), "Auditchain");

            let tokenSymbol = await token.symbol();
            assert.equal(tokenSymbol.toString(), "AUDT");

            let tokenSupply = await token.totalSupply();
            assert.equal(tokenSupply.toString(), initialSupply.toString());
        });
    });

    describe("Mint", async () => {

        it('It should mint 1000 tokens by holder1 to holder2. ', async () => {

            await token.grantRole(CONTROLLER_ROLE, holder1, { from: owner });
            await token.mint(holder2, transferFunds, { from: holder1 });

            let tokenMinted = await token.balanceOf(holder2);
            assert.equal(tokenMinted.toString(), transferFunds.toString());

        })

        it('It should not mint tokens by holder1 before authorization ', async () => {

            try {
                await token.mint(holder2, transferFunds, { from: holder1 });
            } catch (error) {
                ensureException(error);
            }
        })

        it('It should not mint tokens by holder1 when authorization is revoked', async () => {

            await token.grantRole(CONTROLLER_ROLE, holder1, { from: owner });
            await token.revokeRole(CONTROLLER_ROLE, holder1, { from: owner });

            try {
                await token.mint(holder2, transferFunds, { from: holder1 });
            } catch (error) {
                ensureException(error);
            }
        })


        it('It should not allow to set controller role if the account is not an admin', async () => {

            try {
            await token.grantRole(CONTROLLER_ROLE, holder1, { from: holder2 });

            } catch (error) {
                ensureException(error);
            }
        })

    }
    )

    describe("Migrate", async () => {

        it('MigrationAgent: Should migrate all tokens of holder1. ', async () => {

            let migrationAgent = await MIGRATION_AGENT.new({
                from: owner
            });

            await token.setMigrationAgent(migrationAgent.address);

            let result = await token.migrate({
                from: holder1
            })

            let oldBalance = await token.balanceOf(holder1);

            assert.equal(oldBalance, 0);

            let newBalance = await migrationAgent.balances(holder1, {
                from: holder1
            });
            assert.equal(newBalance, transferFunds);
        })



        it('MigrationAgent: Should fail migrating because Migration Agent is not configured. ', async () => {

            try {

                await token.migrate({
                    from: holder1
                })

            } catch (error) {
                ensureException(error);
            }

        })

        it('MigrationAgent: Should fail setting new Migration Agent due to unautharized attempt. ', async () => {

            try {

                let migrationAgent = await MIGRATION_AGENT.new({
                    from: holder1
                });

                await token.setMigrationAgent(migrationAgent.address, { from: holder1 });

            } catch (error) {
                ensureException(error);
            }

        })
    })


    describe("transfer", async () => {
        it('transfer: ether directly to the token contract -- it will throw', async () => {
            let token = await TOKEN.new(owner);
            try {
                await web3
                    .eth
                    .sendTransaction({
                        from: holder1,
                        to: token.address,
                        value: web3.utils.toWei('10', 'Ether')
                    });
            } catch (error) {
                ensureException(error);
            }
        });

        it('transfer: should transfer 1000 to holder1 from owner', async () => {

            let balance = await token
                .balanceOf
                .call(holder1);
            assert.strictEqual(balance.toNumber(), transferFunds);
        });

        it('transfer: first should transfer 10000 to holder1 from owner then holder1 transfers 10000 to holder2',
            async () => {

                await token.transfer(holder2, transferFunds, {
                    from: holder1
                });

                let balanceHolder1 = await token
                    .balanceOf
                    .call(holder1)

                let balanceHolder2 = await token
                    .balanceOf
                    .call(holder2);

                assert.strictEqual(balanceHolder2.toNumber(), transferFunds);

                assert.strictEqual(balanceHolder1.toNumber(), 0);
            });

        it('transfer: should fail when transferring to token contract', async () => {

            try {

                await token.transfer(token.address, transferFunds, {
                    from: owner
                });

            } catch (error) {
                ensureException(error);
            }
        });

        it('transfer: should fail when transferring to user who is locked', async () => {

            await token.addLock(holder1, { from: owner })

            try {

                await token.transfer(holder1, transferFunds, {
                    from: holder2
                });

            } catch (error) {
                ensureException(error);
            }
        });

        it('transfer: should fail when transferring from user who is locked', async () => {

            await token.addLock(holder1, { from: owner })

            try {

                await token.transfer(holder2, transferFunds, {
                    from: holder1
                });

            } catch (error) {
                ensureException(error);
            }
        });


        it('transfer: should transfer tokens to user who is locked from owner', async () => {

            await token.addLock(holder1, { from: owner })

            await token.transfer(holder2, transferFunds, {
                from: owner
            });

            let balanceHolder1 = await token
                .balanceOf
                .call(holder1)

            assert.strictEqual(balanceHolder1.toNumber(), transferFunds);
        })


    });


    describe("approve", async () => {
        it('approve: holder1 should approve 1000 to holder2', async () => {

            await token.approve(holder2, transferFunds, {
                from: holder1
            });
            let _allowance = await token
                .allowance
                .call(holder1, holder2);
            assert.strictEqual(_allowance.toNumber(), transferFunds);
        });

        it('approve: holder1 should approve 1000 to holder2 & withdraws 200 once', async () => {


            await token.approve(holder2, transferFunds, {
                from: holder1
            })
            let _allowance1 = await token
                .allowance
                .call(holder1, holder2);
            assert.strictEqual(_allowance1.toNumber(), transferFunds);


            await token.transferFrom(holder1, holder3, 200, {
                from: holder2
            });

            let balance = await token.balanceOf(holder3, {
                from: owner
            })

            assert.strictEqual(balance.toNumber(), 200);


            let _allowance2 = await token
                .allowance
                .call(holder1, holder2);
            assert.strictEqual(_allowance2.toNumber(), 800);

            let _balance = await token
                .balanceOf
                .call(holder1);
            assert.strictEqual(_balance.toNumber(), 800);
        });

        it('approve: holder1 should approve 1000 to holder2 & withdraws 200 twice', async () => {

            await token.approve(holder2, transferFunds, {
                from: holder1
            });
            let _allowance1 = await token
                .allowance
                .call(holder1, holder2);
            assert.strictEqual(_allowance1.toNumber(), transferFunds);

            await token.transferFrom(holder1, holder3, 200, {
                from: holder2
            });
            let _balance1 = await token
                .balanceOf
                .call(holder3);
            assert.strictEqual(_balance1.toNumber(), 200);
            let _allowance2 = await token
                .allowance
                .call(holder1, holder2);
            assert.strictEqual(_allowance2.toNumber(), 800);
            let _balance2 = await token
                .balanceOf
                .call(holder1);
            assert.strictEqual(_balance2.toNumber(), 800);
            await token.transferFrom(holder1, holder4, 200, {
                from: holder2
            });
            let _balance3 = await token
                .balanceOf
                .call(holder4);
            assert.strictEqual(_balance3.toNumber(), 200);
            let _allowance3 = await token
                .allowance
                .call(holder1, holder2);
            assert.strictEqual(_allowance3.toNumber(), 600);
            let _balance4 = await token
                .balanceOf
                .call(holder1);
            assert.strictEqual(_balance4.toNumber(), 600);
        });

        it('Approve max (2^256 - 1)', async () => {
            let token = await TOKEN.new(owner);
            await token.approve(holder1, '115792089237316195423570985008687907853269984665640564039457584007913129639935', {
                from: holder2
            });
            let _allowance = await token.allowance(holder2, holder1);
            //console.log("allowance " + _allowance.toNumber());
            let result = _allowance.toString() === ('115792089237316195423570985008687907853269984665640564039457584007913129639935');
            assert.isTrue(result);
        });


        it('approves: Holder1 approves Holder2 of 1000 & withdraws 800 & 500 (2nd tx should fail)',
            async () => {

                await token.approve(holder2, transferFunds, {
                    from: holder1
                });
                let _allowance1 = await token
                    .allowance
                    .call(holder1, holder2);
                assert.strictEqual(_allowance1.toNumber(), transferFunds);
                await token.transferFrom(holder1, holder3, 800, {
                    from: holder2
                });
                let _balance1 = await token
                    .balanceOf
                    .call(holder3);
                assert.strictEqual(_balance1.toNumber(), 800);
                let _allowance2 = await token
                    .allowance
                    .call(holder1, holder2);
                assert.strictEqual(_allowance2.toNumber(), 200);
                let _balance2 = await token
                    .balanceOf
                    .call(holder1);
                assert.strictEqual(_balance2.toNumber(), 200);
                try {
                    await token.transferFrom(holder1, holder3, 500, {
                        from: holder2
                    });
                } catch (error) {
                    ensureException(error);
                }
            });

        it('approve: should fail when trying to approve token contract as spender', async () => {

            try {
                await token.approve(token.address, transferFunds, {
                    from: owner
                });
            } catch (error) {
                ensureException(error);
            }
        });


        it('approve: should fail when approval comes from the user who is locked', async () => {

            await token.addLock(holder1, { from: owner })

            try {

                await token.approve(holder2, transferFunds, {
                    from: holder1
                });

            } catch (error) {
                ensureException(error);
            }
        });

        it('approve: should fail when approving user who is locked', async () => {

            await token.addLock(holder1, { from: owner })

            try {

                await token.approve(holder1, transferFunds, {
                    from: owner
                })

            } catch (error) {
                ensureException(error);
            }
        });
    });

    describe("transferFrom", async () => {
        it('transferFrom: Attempt to  withdraw from account with no allowance  -- fail', async () => {


            try {
                await token
                    .transferFrom
                    .call(holder1, holder3, 100, {
                        from: holder2
                    });
            } catch (error) {
                ensureException(error);
            }
        });

        it('transferFrom: Allow holder2 1000 to withdraw from holder1. Withdraw 800 and then approve 0 & attempt transfer',
            async () => {

                await token.approve(holder2, transferFunds, {
                    from: holder1
                });
                let _allowance1 = await token
                    .allowance
                    .call(holder1, holder2);
                assert.strictEqual(_allowance1.toNumber(), transferFunds);
                await token.transferFrom(holder1, holder3, 200, {
                    from: holder2
                });
                let _balance1 = await token
                    .balanceOf
                    .call(holder3);
                assert.strictEqual(_balance1.toNumber(), 200);
                let _allowance2 = await token
                    .allowance
                    .call(holder1, holder2);
                assert.strictEqual(_allowance2.toNumber(), 800);
                let _balance2 = await token
                    .balanceOf
                    .call(holder1);
                assert.strictEqual(_balance2.toNumber(), 800);
                await token.approve(holder2, 0, {
                    from: holder1
                });
                try {
                    await token.transferFrom(holder1, holder3, 200, {
                        from: holder2
                    });
                } catch (error) {
                    ensureException(error);
                }
            });

        it('transferFrom: should fail when transferring to user who is locked', async () => {

            await token.approve(holder2, transferFunds, {
                from: holder1
            });

            await token.addLock(holder3, { from: owner })

            try {

                await token.transferFrom(holder1, holder3, transferFunds, {
                    from: holder2
                });

            } catch (error) {
                ensureException(error);
            }
        });

        it('transferFrom: should fail when transferring from user who is locked', async () => {

            await token.approve(holder2, transferFunds, {
                from: holder1
            });

            await token.addLock(holder1, { from: owner })

            try {

                await token.transferFrom(holder1, holder3, transferFunds, {
                    from: holder2
                });

            } catch (error) {
                ensureException(error);
            }
        });
    });


    describe("burn", async () => {

        it('burn: Burn 1000 tokens in owner account successfully', async () => {

            let balance = await token.balanceOf(owner);

            let numberTocompare = BigNumber(balance.toString()).minus(allowedAmount.toString()).toString()
            // assert.equal(balance, transferFunds);
            await token.burn(allowedAmount, {
                from: owner
            });

            balance = await token.balanceOf(owner);
            assert.equal(balance.toString(), numberTocompare);
        })

        it('burn: Burn 1001 tokens in owner account should fail', async () => {

            try {
                await token.burn(transferFunds, {
                    from: owner
                });
            } catch (error) {
                ensureException(error);
            }
        })

        it('burn: Burn 1000 tokens in holder1 account should fail. No tokens available', async () => {


            try {
                await token.burn(transferFunds, {
                    from: holder1
                });
            } catch (error) {
                ensureException(error);
            }
        })



    })


    describe("burnFrom", async () => {

        it('burnFrom: Burn 1000 tokens by holder1 in owner account successfully', async () => {

            let balance = await token.balanceOf(owner);

            let numberTocompare = BigNumber(balance.toString()).minus(allowedAmount.toString()).toString()

            await token.approve(holder1, allowedAmount, {
                from: owner
            });

            await token.burnFrom(owner, allowedAmount, {
                from: holder1
            });

            balance = await token.balanceOf(owner);

            assert.equal(balance.toString(), numberTocompare);

        })

        it('burnFrom: Burn 1000 tokens by holder2 in owner account should fail', async () => {

            await token.approve(holder1, transferFunds, {
                from: owner
            });

            try {
                await token.burnFrom(owner, transferFunds, {
                    from: holder2
                });
            } catch (error) {
                ensureException(error);
            }

        })

        it('burnFrom: Burn 1001 tokens by holder1 in owner account should fail', async () => {


            await token.approve(holder1, transferFunds, {
                from: owner
            });
            try {
                await token.burnFrom(owner, transferFunds + 1, {
                    from: holder1
                });
            } catch (error) {
                ensureException(error);
            }
        })

    })


    describe("Pausing", async () => {

        it('pause: It should pause token contract from authorized user ', async () => {

            // await token.setController(holder1, { from: owner });
            await token.grantRole(CONTROLLER_ROLE, holder1, { from: owner });

            await token.pause({ from: holder1 });
            let paused = await token.paused();
            assert.isTrue(paused);

        })

        it('unpause: It should unpause token contract from authorized user ', async () => {

            // await token.setController(holder1, { from: owner });
            await token.grantRole(CONTROLLER_ROLE, holder1, { from: owner });            
            await token.pause({ from: holder1 });
            await token.unpause({ from: holder1 });
            let paused = await token.paused();
            assert.isFalse(paused);

        })

        it('pause: It should fail pausing from unauthorized user ', async () => {

            try {
                await token.pause({ from: holder1 });
            } catch (error) {
                ensureException(error);
            }

        })

        it('pause: It should fail pausing token which is already paused ', async () => {

            // await token.setController(holder1, { from: owner });
            await token.grantRole(CONTROLLER_ROLE, holder1, { from: owner });
            await token.pause({ from: holder1 });

            try {
                await token.pause({ from: holder1 });
            } catch (error) {
                ensureException(error);
            }

        })



    })

    describe("Locked", async () => {

        it('addLock: It should lock user ', async () => {

            // await token.setController(holder1, { from: owner })
            await token.grantRole(CONTROLLER_ROLE, holder1, { from: owner });


            await token.addLock(holder2, {
                from: holder1
            });

            let result = await token.isLocked(holder2, {
                from: owner
            });
            assert.isTrue(result);
        })

        it('removeLock: It should unlock user', async () => {

            // await token.setController(holder1, { from: owner })
            await token.grantRole(CONTROLLER_ROLE, holder1, { from: owner });


            await token.addLock(holder2, {
                from: holder1
            });

            await token.removeLock(holder2, {
                from: holder1
            });

            let result = await token.isLocked(holder2, {
                from: owner
            });
            assert.isFalse(result);
        })


        it('addLock: It should fail when locking user by unauthorized user', async () => {
            try {
                await token.addLock(holder1, {
                    from: holder2
                });
            } catch (error) {
                ensureException(error);
            }
        })


    })




    describe('events', async () => {

        it('should log LogControllerSet event after setController', async () => {

            // let result = await token.setController(holder1, {
            //     from: owner
            // });
            let result = await token.grantRole(CONTROLLER_ROLE, holder1, { from: owner });


            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'RoleGranted');
            assert.equal(event.args.account, holder1);
        })


        it('should log LogControllerRevoked event after revokeController', async () => {

            // await token.setController(holder1, {
            //     from: owner
            // });

            await token.grantRole(CONTROLLER_ROLE, holder1, { from: owner });


            let result = await token.revokeRole(CONTROLLER_ROLE, holder1, {
                from: owner
            });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'RoleRevoked');
            assert.equal(event.args.account, holder1);
        })


        it('should log Transfer event after transfer()', async () => {

            token = await TOKEN.new(owner);
            let result = await token.transfer(holder3, transferFunds, {
                from: owner
            });


            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'Transfer');
            assert.equal(event.args.from, owner);
            assert.equal(event.args.to, holder3);
            assert.equal(Number(event.args.value), transferFunds);
        });

        it('should log Transfer and Approve events after transferFrom()', async () => {
            let token = await TOKEN.new(owner);
            await token.approve(holder1, allowedAmount, {
                from: owner
            });

            let value = allowedAmount / 2;
            let result = await token.transferFrom(owner, holder2, value, {
                from: holder1,
            });
            assert.lengthOf(result.logs, 2);
            let event1 = result.logs[0];
            assert.equal(event1.event, 'Transfer');
            assert.equal(event1.args.from, owner);
            assert.equal(event1.args.to, holder2);
            assert.equal(Number(event1.args.value), value);
            let event2 = result.logs[1];
            assert.equal(event2.event, 'Approval');
            assert.equal(event2.args.owner, owner);
            assert.equal(event2.args.spender, holder1);
            assert.equal(Number(event2.args.value), allowedAmount - value);

        });

        it('should log Approve event after approve()', async () => {

            let result = await token.approve(holder1, allowedAmount, {
                from: owner
            });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'Approval');
            assert.equal(event.args.spender, holder1);
            assert.equal(Number(event.args.value), allowedAmount);
        });


        it('should log Transfer event after burn()', async () => {

            let result = await token.burn(transferFunds, {
                from: owner
            });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'Transfer');
            assert.equal(event.args.from, owner);
            assert.equal(event.args.to, "0x0000000000000000000000000000000000000000");
            assert.equal(Number(event.args.value), transferFunds);
        });

        it('should log Transfer and Approve event after burnFrom()', async () => {

            await token.approve(holder1, allowedAmount, {
                from: owner
            });

            let value = allowedAmount / 2;
            let result = await token.burnFrom(owner, value, {
                from: holder1
            });

            assert.lengthOf(result.logs, 2);

            let event1 = result.logs[1];
            assert.equal(event1.event, 'Transfer');
            assert.equal(event1.args.from, owner);
            assert.equal(event1.args.to, "0x0000000000000000000000000000000000000000");
            assert.equal(Number(event1.args.value), value);
            let event2 = result.logs[0];
            assert.equal(event2.event, 'Approval');
            assert.equal(event2.args.owner, owner);
            assert.equal(event2.args.spender, holder1);
            assert.equal(Number(event2.args.value), allowedAmount - value);
        });


        it('should log Transfer after mint()', async () => {

            // token = await TOKEN.new();

            // await token.setMintContract(holder3, {
            //     from: owner
            // });

            // increaseTime(31708800); // move forward by one year

            // let result = await token.mint({from:owner});            

            // assert.lengthOf(result.logs, 1);

            // let event = result.logs[0];
            // assert.equal(event.event, 'Transfer');
            // assert.equal(event.args.to, holder3);
            // assert.equal(event.args.from, "0x0000000000000000000000000000000000000000");
            // assert.equal(event.args.value.toString(), oneYearSupply.toString());

        })

        it('should log Paused after pause()', async () => {

            let result = await token.pause({
                from: owner
            });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'Paused');
            assert.equal(event.args.account, owner);
        })

        it('should log Unpaused after unpause()', async () => {

            await token.pause({
                from: owner
            });

            let result = await token.unpause({
                from: owner
            });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'Unpaused');
            assert.equal(event.args.account, owner);
        })


        it('should log RoleGranted to new admin)', async () => {

            let result = await token.grantRole(DEFAULT_ADMIN_ROLE, holder1, {
                from: owner
            });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'RoleGranted');
            assert.equal(event.args.account, holder1);
        })



        it('should log Migrate after migrate()', async () => {

            let migrationAgent = await MIGRATION_AGENT.new({
                from: owner
            });

            await token.setMigrationAgent(migrationAgent.address);

            let result = await token.migrate({
                from: holder1
            })

            assert.lengthOf(result.logs, 4);

            let event1 = result.logs[3];
            assert.equal(event1.event, 'Migrate');
            assert.equal(event1.args.from, holder1);
            assert.equal(event1.args.to, migrationAgent.address);
            assert.equal(event1.args.value, transferFunds);
        })

        it('should log AddedLock after addLock()', async () => {

            let result = await token.addLock(holder1, {
                from: owner
            });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'AddedLock');
            assert.equal(event.args.user, holder1);
        })

        it('should log Removedlock after removeLock()', async () => {

            await token.addLock(holder1, {
                from: owner
            });

            let result = await token.removeLock(holder1, {
                from: owner
            });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'RemovedLock');
            assert.equal(event.args.user, holder1);
        })
    });



})