// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentEscrow - Minimal escrow for AI agent task payments
/// @author GioroX AI, Inc.
/// @notice This contract enables trustless payment settlement between task buyers and AI agents
/// @dev Supports native token payments with proof-based verification
contract AgentEscrow {
    struct Escrow {
        address payer;        // task buyer
        address agent;        // AI agent / service provider
        uint256 amount;       // payment in native token
        bytes32 taskId;       // external task identifier (AP2/X402)
        bytes32 proofHash;    // hash of result stored off-chain (e.g. Walrus)
        bool funded;
        bool completed;
        bool released;
        bool refunded;
    }

    uint256 public nextEscrowId;
    mapping(uint256 => Escrow) public escrows;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed payer,
        address indexed agent,
        uint256 amount,
        bytes32 taskId
    );

    event ProofSubmitted(
        uint256 indexed escrowId,
        address indexed agent,
        bytes32 proofHash
    );

    event PaymentReleased(
        uint256 indexed escrowId,
        address indexed payer,
        address indexed agent,
        uint256 amount
    );

    event PaymentRefunded(
        uint256 indexed escrowId,
        address indexed payer,
        uint256 amount
    );

    /// @notice Create and fund an escrow for a given agent and task
    /// @param agent Address of the agent that will complete the task
    /// @param taskId External identifier for the task (AP2/X402 id, URI, etc.)
    /// @return escrowId The newly created escrow id
    function createEscrow(address agent, bytes32 taskId)
        external
        payable
        returns (uint256 escrowId)
    {
        require(agent != address(0), "invalid agent");
        require(msg.value > 0, "no funds sent");

        escrowId = nextEscrowId++;
        Escrow storage e = escrows[escrowId];

        e.payer = msg.sender;
        e.agent = agent;
        e.amount = msg.value;
        e.taskId = taskId;
        e.funded = true;

        emit EscrowCreated(escrowId, msg.sender, agent, msg.value, taskId);
    }

    /// @notice Agent submits a proof hash for the task result
    /// @dev In a full system this would be validated against Walrus or similar storage
    /// @param escrowId The escrow identifier
    /// @param proofHash Hash of the completed work result
    function submitProof(uint256 escrowId, bytes32 proofHash) external {
        Escrow storage e = escrows[escrowId];

        require(e.funded, "escrow not found or not funded");
        require(!e.completed, "already completed");
        require(msg.sender == e.agent, "only agent");

        e.proofHash = proofHash;
        e.completed = true;

        emit ProofSubmitted(escrowId, msg.sender, proofHash);
    }

    /// @notice Payer releases payment to the agent after verifying the proof off-chain
    /// @param escrowId The escrow identifier
    function releasePayment(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];

        require(e.funded, "escrow not found or not funded");
        require(e.completed, "task not completed");
        require(!e.released, "already released");
        require(!e.refunded, "already refunded");
        require(msg.sender == e.payer, "only payer");

        e.released = true;

        (bool ok, ) = e.agent.call{value: e.amount}("");
        require(ok, "transfer failed");

        emit PaymentReleased(escrowId, e.payer, e.agent, e.amount);
    }

    /// @notice Payer can refund if the agent never completes the task
    /// @param escrowId The escrow identifier
    function refund(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];

        require(e.funded, "escrow not found or not funded");
        require(!e.completed, "already completed");
        require(!e.released, "already released");
        require(!e.refunded, "already refunded");
        require(msg.sender == e.payer, "only payer");

        e.refunded = true;

        (bool ok, ) = e.payer.call{value: e.amount}("");
        require(ok, "refund failed");

        emit PaymentRefunded(escrowId, e.payer, e.amount);
    }

    /// @notice Get the full escrow details
    /// @param escrowId The escrow identifier
    /// @return The escrow struct containing all details
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }
}
