// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SiggyPredictionMarket} from "../src/SiggyPredictionMarket.sol";

contract SiggyPredictionMarketTest is Test {
    SiggyPredictionMarket market;
    address user = makeAddr("user");
    bytes32 marketId = keccak256("siggy-test");

    function setUp() public {
        market = new SiggyPredictionMarket(address(this));
        vm.deal(user, 10 ether);
    }

    function testEnterMarketStoresPosition() public {
        vm.prank(user);
        market.enterMarket{value: 1 ether}(
            marketId,
            "Will SIGGY ship?",
            uint64(block.timestamp + 1 days),
            true
        );
        (uint128 yesAmount, uint128 noAmount, ) = market.positions(
            marketId,
            user
        );
        assertEq(yesAmount, 1 ether);
        assertEq(noAmount, 0);
    }

    function testCallbackRejectsUnauthorizedSender() public {
        vm.prank(user);
        vm.expectRevert(
            SiggyPredictionMarket.UnauthorizedCallback.selector
        );
        market.onSovereignAgentResult(bytes32("job"), "");
    }
}

