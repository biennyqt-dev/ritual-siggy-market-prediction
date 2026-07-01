// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SIGGY Prediction Market
/// @notice A lightweight prediction-market ledger with Ritual sovereign-agent resolution evidence.
contract SiggyPredictionMarket {
    address public constant ASYNC_DELIVERY =
        0x5A16214fF555848411544b005f7Ac063742f39F6;
    address public constant SOVEREIGN_AGENT = address(0x080C);

    struct Market {
        string question;
        uint64 closeTime;
        uint128 yesPool;
        uint128 noPool;
        bool resolved;
        bool outcome;
        bool exists;
    }

    struct Position {
        uint128 yesAmount;
        uint128 noAmount;
        bool claimed;
    }

    struct StorageRef {
        string platform;
        string path;
        string keyRef;
    }

    address public owner;
    bytes32 public pendingResolutionMarket;
    mapping(bytes32 => Market) public markets;
    mapping(bytes32 => mapping(address => Position)) public positions;
    mapping(bytes32 => string) public agentEvidence;
    mapping(bytes32 => bool) public callbackFulfilled;

    error NotOwner();
    error UnauthorizedCallback();
    error InvalidMarket();
    error MarketClosed();
    error MarketStillOpen();
    error AlreadyResolved();
    error NothingToClaim();
    error AlreadyClaimed();
    error TransferFailed();
    error AgentCallFailed();
    error AgentRequestPending();

    event MarketCreated(
        bytes32 indexed marketId,
        string question,
        uint64 closeTime
    );
    event PredictionPlaced(
        bytes32 indexed marketId,
        address indexed user,
        bool yes,
        uint256 amount
    );
    event AgentResolutionRequested(bytes32 indexed marketId, bytes phaseOne);
    event AgentResolutionReceived(
        bytes32 indexed marketId,
        bytes32 indexed jobId,
        bool success,
        string evidence
    );
    event MarketResolved(
        bytes32 indexed marketId,
        bool outcome,
        bytes32 indexed agentJobId
    );
    event WinningsClaimed(
        bytes32 indexed marketId,
        address indexed user,
        uint256 amount
    );

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        owner = initialOwner == address(0) ? msg.sender : initialOwner;
    }

    /// @notice Register an external market on first use and place a position.
    function enterMarket(
        bytes32 marketId,
        string calldata question,
        uint64 closeTime,
        bool yes
    ) external payable {
        if (msg.value == 0 || bytes(question).length == 0) revert InvalidMarket();
        Market storage market = markets[marketId];
        if (!market.exists) {
            if (closeTime <= block.timestamp) revert MarketClosed();
            market.question = question;
            market.closeTime = closeTime;
            market.exists = true;
            emit MarketCreated(marketId, question, closeTime);
        }
        if (market.resolved || block.timestamp >= market.closeTime) {
            revert MarketClosed();
        }

        Position storage position = positions[marketId][msg.sender];
        if (yes) {
            market.yesPool += uint128(msg.value);
            position.yesAmount += uint128(msg.value);
        } else {
            market.noPool += uint128(msg.value);
            position.noAmount += uint128(msg.value);
        }
        emit PredictionPlaced(marketId, msg.sender, yes, msg.value);
    }

    /// @notice Submit a pre-encoded 23-field Sovereign Agent request.
    /// @dev The payload deliveryTarget must be this contract and the selector must
    /// be onSovereignAgentResult(bytes32,bytes). Use explicit gas from the client.
    function requestAgentResolution(
        bytes32 marketId,
        bytes calldata sovereignAgentInput
    ) external onlyOwner returns (bytes memory phaseOne) {
        Market storage market = markets[marketId];
        if (!market.exists) revert InvalidMarket();
        if (pendingResolutionMarket != bytes32(0)) revert AgentRequestPending();
        pendingResolutionMarket = marketId;
        (bool ok, bytes memory output) = SOVEREIGN_AGENT.call(
            sovereignAgentInput
        );
        if (!ok) {
            pendingResolutionMarket = bytes32(0);
            revert AgentCallFailed();
        }
        emit AgentResolutionRequested(marketId, output);
        return output;
    }

    /// @notice Authenticated Phase 2 delivery from Ritual AsyncDelivery.
    function onSovereignAgentResult(
        bytes32 jobId,
        bytes calldata result
    ) external {
        if (msg.sender != ASYNC_DELIVERY) revert UnauthorizedCallback();
        if (callbackFulfilled[jobId]) revert AlreadyResolved();
        bytes32 marketId = pendingResolutionMarket;
        if (marketId == bytes32(0)) revert InvalidMarket();

        callbackFulfilled[jobId] = true;
        pendingResolutionMarket = bytes32(0);

        try this.parseAgentResult(result) returns (
            bool success,
            string memory errorMessage,
            string memory text
        ) {
            string memory evidence = success &&
                bytes(errorMessage).length == 0 &&
                bytes(text).length > 0
                ? text
                : errorMessage;
            agentEvidence[marketId] = evidence;
            emit AgentResolutionReceived(marketId, jobId, success, evidence);
        } catch {
            agentEvidence[marketId] = "Agent payload was not decodable";
            emit AgentResolutionReceived(
                marketId,
                jobId,
                false,
                "Agent payload was not decodable"
            );
        }
    }

    /// @notice Defensive parser for the canonical Sovereign Agent Phase 2 tuple.
    function parseAgentResult(
        bytes calldata result
    )
        external
        pure
        returns (bool success, string memory errorMessage, string memory text)
    {
        (
            success,
            errorMessage,
            text,
            ,
            ,

        ) = abi.decode(
            result,
            (
                bool,
                string,
                string,
                StorageRef,
                StorageRef,
                StorageRef[]
            )
        );
    }

    /// @notice Resolve after close, attaching the agent job used as evidence.
    function resolveMarket(
        bytes32 marketId,
        bool outcome,
        bytes32 agentJobId
    ) external onlyOwner {
        Market storage market = markets[marketId];
        if (!market.exists) revert InvalidMarket();
        if (block.timestamp < market.closeTime) revert MarketStillOpen();
        if (market.resolved) revert AlreadyResolved();
        market.resolved = true;
        market.outcome = outcome;
        emit MarketResolved(marketId, outcome, agentJobId);
    }

    /// @notice Claim a pro-rata share of the entire pool after resolution.
    function claim(bytes32 marketId) external {
        Market storage market = markets[marketId];
        Position storage position = positions[marketId][msg.sender];
        if (!market.resolved) revert MarketStillOpen();
        if (position.claimed) revert AlreadyClaimed();

        uint256 winningStake = market.outcome
            ? position.yesAmount
            : position.noAmount;
        uint256 winningPool = market.outcome ? market.yesPool : market.noPool;
        if (winningStake == 0 || winningPool == 0) revert NothingToClaim();

        position.claimed = true;
        uint256 payout = (winningStake *
            (uint256(market.yesPool) + uint256(market.noPool))) / winningPool;
        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        if (!sent) revert TransferFailed();
        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidMarket();
        owner = newOwner;
    }

    receive() external payable {}
}
