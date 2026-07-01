// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SiggyPredictionMarket} from "../src/SiggyPredictionMarket.sol";

contract DeploySiggy is Script {
    function run() external returns (SiggyPredictionMarket market) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        vm.startBroadcast(privateKey);
        market = new SiggyPredictionMarket(deployer);
        vm.stopBroadcast();
        console2.log("SIGGY Prediction Market:", address(market));
    }
}

