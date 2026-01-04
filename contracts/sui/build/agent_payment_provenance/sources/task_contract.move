/// Task Contract - Core escrow and settlement logic for AI agent payments
/// Implements: Task creation, claiming, evidence submission, verification, and settlement
module agent_payment_provenance::task_contract {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::vector;

    // ========== Error Codes ==========
    const EInvalidDeadline: u64 = 1;
    const EInvalidReward: u64 = 2;
    const ETaskNotActive: u64 = 3;
    const EMaxMinersReached: u64 = 4;
    const ENotTaskCreator: u64 = 5;
    const ETaskNotCompleted: u64 = 6;
    const EAlreadyClaimed: u64 = 7;
    const ENotClaimant: u64 = 8;
    const EInvalidSubmission: u64 = 9;
    const ETaskExpired: u64 = 10;
    const ENoSubmissions: u64 = 11;

    // ========== Core Data Structures ==========

    /// Main task object holding escrow funds and task metadata
    public struct Task has key, store {
        id: UID,
        creator: address,              // Task buyer/payer
        target_info: vector<u8>,       // Task description/requirements
        reward_pool: Balance<SUI>,     // Escrowed SUI for payment
        deadline: u64,                 // Unix timestamp
        max_miners: u64,               // Maximum number of workers allowed
        status: u8,                    // 0=Active, 1=Completed, 2=Cancelled
        created_at: u64,               // Timestamp
        total_reward: u64,             // Original reward amount for reference
    }

    /// Claim represents a worker's intent to work on a task
    public struct Claim has key, store {
        id: UID,
        task_id: ID,                   // Reference to parent task
        worker: address,               // Worker's address
        claimed_at: u64,               // Timestamp
    }

    /// Submission contains proof of completed work
    public struct Submission has key, store {
        id: UID,
        task_id: ID,                   // Reference to parent task
        worker: address,               // Worker who submitted
        blob_id: vector<u8>,           // Walrus blob identifier
        evidence_hash: vector<u8>,     // Hash of evidence for integrity verification
        submitted_at: u64,             // Timestamp
        verified: bool,                // Whether buyer approved this submission
    }

    // ========== Events ==========

    public struct TaskCreated has copy, drop {
        task_id: ID,
        creator: address,
        reward: u64,
        deadline: u64,
        max_miners: u64,
    }

    public struct TaskClaimed has copy, drop {
        task_id: ID,
        claim_id: ID,
        worker: address,
        claimed_at: u64,
    }

    public struct EvidenceSubmitted has copy, drop {
        task_id: ID,
        submission_id: ID,
        worker: address,
        blob_id: vector<u8>,
        evidence_hash: vector<u8>,
    }

    public struct TaskSettled has copy, drop {
        task_id: ID,
        total_paid: u64,
        num_workers: u64,
    }

    public struct TaskCancelled has copy, drop {
        task_id: ID,
        refunded_amount: u64,
    }

    // ========== Entry Functions ==========

    /// Create a new task and lock funds in escrow
    /// 
    /// # Arguments
    /// * `target_info` - Task description and requirements
    /// * `reward` - SUI coins to be escrowed
    /// * `deadline` - Unix timestamp when task expires
    /// * `max_miners` - Maximum number of workers allowed
    /// * `clock` - Sui clock object for timestamp
    /// * `ctx` - Transaction context
    public entry fun create_task(
        target_info: vector<u8>,
        reward: Coin<SUI>,
        deadline: u64,
        max_miners: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(deadline > current_time, EInvalidDeadline);
        
        let reward_value = coin::value(&reward);
        assert!(reward_value > 0, EInvalidReward);

        let task = Task {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            target_info,
            reward_pool: coin::into_balance(reward),
            deadline,
            max_miners,
            status: 0, // Active
            created_at: current_time,
            total_reward: reward_value,
        };

        let task_id = object::id(&task);

        event::emit(TaskCreated {
            task_id,
            creator: task.creator,
            reward: reward_value,
            deadline,
            max_miners,
        });

        transfer::share_object(task);
    }

    /// Worker claims a task to signal intent to work
    ///
    /// # Arguments
    /// * `task` - Mutable reference to the task object
    /// * `clock` - Sui clock object
    /// * `ctx` - Transaction context
    public entry fun claim_task(
        task: &mut Task,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(task.status == 0, ETaskNotActive);
        assert!(current_time < task.deadline, ETaskExpired);

        // Note: In production, we'd track claims to enforce max_miners
        // For now, we'll check this during settlement
        
        let claim = Claim {
            id: object::new(ctx),
            task_id: object::id(task),
            worker: tx_context::sender(ctx),
            claimed_at: current_time,
        };

        let claim_id = object::id(&claim);

        event::emit(TaskClaimed {
            task_id: object::id(task),
            claim_id,
            worker: tx_context::sender(ctx),
            claimed_at: current_time,
        });

        transfer::transfer(claim, tx_context::sender(ctx));
    }

    /// Submit evidence of completed work
    ///
    /// # Arguments
    /// * `task` - Reference to the task object
    /// * `_claim` - Claim object proving worker's right to submit (consumed)
    /// * `blob_id` - Walrus blob identifier
    /// * `evidence_hash` - Hash of the evidence data
    /// * `clock` - Sui clock object
    /// * `ctx` - Transaction context
    public entry fun submit_evidence(
        task: &Task,
        _claim: Claim,
        blob_id: vector<u8>,
        evidence_hash: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(task.status == 0, ETaskNotActive);
        
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time < task.deadline, ETaskExpired);

        // Verify the claim matches this task
        assert!(_claim.task_id == object::id(task), EInvalidSubmission);
        assert!(_claim.worker == tx_context::sender(ctx), ENotClaimant);

        let submission = Submission {
            id: object::new(ctx),
            task_id: object::id(task),
            worker: tx_context::sender(ctx),
            blob_id: blob_id,
            evidence_hash: evidence_hash,
            submitted_at: current_time,
            verified: false,
        };

        let submission_id = object::id(&submission);

        event::emit(EvidenceSubmitted {
            task_id: object::id(task),
            submission_id,
            worker: tx_context::sender(ctx),
            blob_id: submission.blob_id,
            evidence_hash: submission.evidence_hash,
        });

        // Delete the claim as it's been used
        let Claim { id, task_id: _, worker: _, claimed_at: _ } = _claim;
        object::delete(id);

        // Transfer submission to task creator for verification
        transfer::transfer(submission, task.creator);
    }

    /// Verify and settle task - distribute rewards to approved workers
    ///
    /// # Arguments
    /// * `task` - Mutable task object to settle
    /// * `approved_submissions` - Vector of approved submission objects
    /// * `ctx` - Transaction context
    public entry fun verify_and_settle(
        task: &mut Task,
        mut approved_submissions: vector<Submission>,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == task.creator, ENotTaskCreator);
        assert!(task.status == 0, ETaskNotActive);
        
        let num_approved = vector::length(&approved_submissions);
        assert!(num_approved > 0, ENoSubmissions);
        assert!(num_approved <= task.max_miners, EMaxMinersReached);

        // Calculate reward per worker
        let total_available = balance::value(&task.reward_pool);
        let reward_per_worker = total_available / num_approved;

        let mut i = 0;
        let mut total_paid = 0;

        while (i < num_approved) {
            let submission = vector::pop_back(&mut approved_submissions);
            
            // Verify submission belongs to this task
            assert!(submission.task_id == object::id(task), EInvalidSubmission);

            // Transfer reward to worker
            let payment = coin::take(&mut task.reward_pool, reward_per_worker, ctx);
            transfer::public_transfer(payment, submission.worker);

            total_paid = total_paid + reward_per_worker;

            // Mark submission as verified and delete
            let Submission { 
                id, 
                task_id: _, 
                worker: _, 
                blob_id: _, 
                evidence_hash: _, 
                submitted_at: _,
                verified: _,
            } = submission;
            object::delete(id);

            i = i + 1;
        };

        vector::destroy_empty(approved_submissions);

        // Mark task as completed
        task.status = 1;

        event::emit(TaskSettled {
            task_id: object::id(task),
            total_paid,
            num_workers: num_approved,
        });
    }

    /// Cancel task and refund remaining funds to creator
    /// Can only be called by task creator
    ///
    /// # Arguments
    /// * `task` - Mutable task object to cancel
    /// * `ctx` - Transaction context
    public entry fun cancel_task(
        task: &mut Task,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == task.creator, ENotTaskCreator);
        assert!(task.status == 0, ETaskNotActive);

        let refund_amount = balance::value(&task.reward_pool);
        let refund_coin = coin::take(&mut task.reward_pool, refund_amount, ctx);
        
        transfer::public_transfer(refund_coin, task.creator);

        task.status = 2; // Cancelled

        event::emit(TaskCancelled {
            task_id: object::id(task),
            refunded_amount: refund_amount,
        });
    }

    // ========== View Functions ==========

    /// Get task details (read-only)
    public fun get_task_info(task: &Task): (address, u64, u64, u64, u8) {
        (
            task.creator,
            balance::value(&task.reward_pool),
            task.deadline,
            task.max_miners,
            task.status,
        )
    }

    /// Get submission details (read-only)
    public fun get_submission_info(submission: &Submission): (address, vector<u8>, vector<u8>, bool) {
        (
            submission.worker,
            submission.blob_id,
            submission.evidence_hash,
            submission.verified,
        )
    }

    // ========== Test-only Functions ==========
    #[test_only]
    public fun test_create_task_for_testing(
        target_info: vector<u8>,
        reward: Coin<SUI>,
        deadline: u64,
        max_miners: u64,
        ctx: &mut TxContext,
    ): Task {
        Task {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            target_info,
            reward_pool: coin::into_balance(reward),
            deadline,
            max_miners,
            status: 0,
            created_at: 0,
            total_reward: coin::value(&reward),
        }
    }
}
