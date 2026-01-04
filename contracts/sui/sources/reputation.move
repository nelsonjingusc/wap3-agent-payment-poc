/// Reputation Module - On-chain reputation tracking for AI agents
module agent_payment_provenance::reputation {
    use sui::event;

    // ========== Error Codes ==========
    const ENotOwner: u64 = 1;
    const EInvalidScore: u64 = 2;

    // ========== Data Structures ==========

    /// Reputation object tracking agent's performance
    public struct Reputation has key, store {
        id: UID,
        agent: address,                // Agent's address
        score: u64,                    // Reputation score (0-10000, representing 0.00-100.00)
        tasks_completed: u64,          // Total tasks completed
        tasks_successful: u64,         // Tasks where payment was released
        tasks_disputed: u64,           // Tasks with disputes/refunds
        total_earned: u64,             // Total SUI earned
        last_updated: u64,             // Timestamp of last update
    }

    // ========== Events ==========

    public struct ReputationCreated has copy, drop {
        reputation_id: ID,
        agent: address,
        initial_score: u64,
    }

    public struct ReputationUpdated has copy, drop {
        reputation_id: ID,
        agent: address,
        new_score: u64,
        tasks_completed: u64,
        tasks_successful: u64,
    }

    // ========== Entry Functions ==========

    /// Create a new reputation profile for an agent
    ///
    /// # Arguments
    /// * `ctx` - Transaction context
    public entry fun create_reputation(ctx: &mut TxContext) {
        let reputation = Reputation {
            id: object::new(ctx),
            agent: tx_context::sender(ctx),
            score: 5000,  // Start at 50.00 score
            tasks_completed: 0,
            tasks_successful: 0,
            tasks_disputed: 0,
            total_earned: 0,
            last_updated: 0,
        };

        let reputation_id = object::id(&reputation);

        event::emit(ReputationCreated {
            reputation_id,
            agent: reputation.agent,
            initial_score: reputation.score,
        });

        transfer::transfer(reputation, tx_context::sender(ctx));
    }

    /// Update reputation after task completion
    /// This would typically be called by a trusted oracle or the task contract
    ///
    /// # Arguments
    /// * `reputation` - Mutable reputation object
    /// * `task_successful` - Whether the task was successfully completed
    /// * `earned_amount` - Amount earned from this task
    /// * `timestamp` - Current timestamp
    /// * `ctx` - Transaction context
    public entry fun update_after_task(
        reputation: &mut Reputation,
        task_successful: bool,
        earned_amount: u64,
        timestamp: u64,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == reputation.agent, ENotOwner);

        reputation.tasks_completed = reputation.tasks_completed + 1;
        
        if (task_successful) {
            reputation.tasks_successful = reputation.tasks_successful + 1;
            reputation.total_earned = reputation.total_earned + earned_amount;
            
            // Increase score (max 10000)
            let score_increase = 10; // +0.10 per successful task
            let new_score = reputation.score + score_increase;
            if (new_score > 10000) {
                reputation.score = 10000;
            } else {
                reputation.score = new_score;
            }
        } else {
            reputation.tasks_disputed = reputation.tasks_disputed + 1;
            
            // Decrease score (min 0)
            let score_decrease = 20; // -0.20 per disputed task
            if (reputation.score > score_decrease) {
                reputation.score = reputation.score - score_decrease;
            } else {
                reputation.score = 0;
            }
        };

        reputation.last_updated = timestamp;

        event::emit(ReputationUpdated {
            reputation_id: object::id(reputation),
            agent: reputation.agent,
            new_score: reputation.score,
            tasks_completed: reputation.tasks_completed,
            tasks_successful: reputation.tasks_successful,
        });
    }

    // ========== View Functions ==========

    /// Get reputation details (read-only)
    public fun get_reputation_info(reputation: &Reputation): (
        address,  // agent
        u64,      // score
        u64,      // tasks_completed
        u64,      // tasks_successful
        u64,      // total_earned
    ) {
        (
            reputation.agent,
            reputation.score,
            reputation.tasks_completed,
            reputation.tasks_successful,
            reputation.total_earned,
        )
    }

    /// Calculate success rate (returns percentage * 100)
    public fun get_success_rate(reputation: &Reputation): u64 {
        if (reputation.tasks_completed == 0) {
            return 0
        };
        
        (reputation.tasks_successful * 10000) / reputation.tasks_completed
    }

    /// Get formatted score (returns score as percentage 0-100)
    public fun get_score_percentage(reputation: &Reputation): u64 {
        reputation.score / 100
    }
}
