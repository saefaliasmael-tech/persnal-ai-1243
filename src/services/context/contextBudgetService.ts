import type {
  AIProviderConfig,
  ContextBudgetConfig,
  ContextPruneDiagnostics,
  ITokenEstimator,
  OllamaRuntimeOptions,
  PrunedContextResult,
  ResolvedContextBudget,
} from '../../types/models.ts';

/**
 * Isolated Token Estimator Heuristic
 * NOTE: This is an isolated, conservative character-based heuristic (~3.5 chars/token + 4 tokens overhead).
 * It is NOT an exact model tokenizer and is clearly labeled as an approximation for context window safety.
 */
export class ConservativeTokenEstimator implements ITokenEstimator {
  estimateTokens(text: string): number {
    if (!text) return 0;
    // Conservative estimation: ~3.5 characters per token with 4 tokens per-message overhead
    return Math.max(1, Math.ceil(text.length / 3.5)) + 4;
  }

  estimateMessages(messages: { role: string; content: string }[]): number {
    return messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
  }
}

export const defaultTokenEstimator = new ConservativeTokenEstimator();

/**
 * Context Budget Service
 * Centralized service to resolve context limits and safely prune chat history
 * using a request-time sliding window without modifying persistent conversation storage.
 */
export class ContextBudgetService {
  private defaultConfig: Required<ContextBudgetConfig> = {
    reservedOutputTokens: 2048,
    safetyMarginTokens: 512,
    systemReserveTokens: 1024,
  };

  private tokenEstimator: ITokenEstimator = defaultTokenEstimator;

  /**
   * Resolves the effective context budget for an AI request.
   * Priority:
   * 1. Explicit runtime num_ctx (if configured and > 0)
   * 2. Provider contextWindow (if configured and > 0)
   * 3. Model-specific known default (e.g. qwen3:14b reports 40960)
   * 4. Safe fallback (40960)
   */
  resolveBudget(
    providerConfig?: Partial<AIProviderConfig>,
    runtimeOptions?: OllamaRuntimeOptions,
    customBudgetConfig?: ContextBudgetConfig
  ): ResolvedContextBudget {
    const config = { ...this.defaultConfig, ...customBudgetConfig };

    let contextLimit = 40960;
    let resolutionSource: ResolvedContextBudget['resolutionSource'] = 'model_default_40k';

    if (runtimeOptions?.num_ctx && runtimeOptions.num_ctx > 0) {
      contextLimit = runtimeOptions.num_ctx;
      resolutionSource = 'explicit_num_ctx';
    } else if (providerConfig?.contextWindow && providerConfig.contextWindow > 0) {
      contextLimit = providerConfig.contextWindow;
      resolutionSource = 'provider_context_window';
    } else if (providerConfig?.selectedModel?.includes('qwen3')) {
      contextLimit = 40960;
      resolutionSource = 'model_default_40k';
    } else {
      contextLimit = 40960;
      resolutionSource = 'fallback_default';
    }

    const reservedOutputTokens = config.reservedOutputTokens;
    const safetyMarginTokens = config.safetyMarginTokens;
    const systemReserveTokens = config.systemReserveTokens;

    // Total available input budget for all prompt components (system + history + tools)
    const maxInputTokens = Math.max(512, contextLimit - reservedOutputTokens - safetyMarginTokens);

    // Available budget specifically for conversation history/messages after reserving room for system identity
    const availableHistoryTokens = Math.max(256, maxInputTokens - systemReserveTokens);

    return {
      contextLimit,
      reservedOutputTokens,
      safetyMarginTokens,
      systemReserveTokens,
      maxInputTokens,
      availableHistoryTokens,
      resolutionSource,
    };
  }

  /**
   * Prunes chat history to fit within the resolved context budget at request-time.
   *
   * Guarantees:
   * 1. All leading System message(s) are strictly preserved.
   * 2. The newest User message (current request) is always preserved.
   * 3. Prior conversational turns are selected backwards in complete pairs (User + Assistant) where possible.
   * 4. Message order is strictly preserved.
   * 5. Message content is NEVER altered or shortened.
   * 6. Persistent localStorage history remains 100% untouched.
   */
  pruneChatHistory(
    messages: { role: string; content: string }[],
    budget: ResolvedContextBudget
  ): PrunedContextResult {
    const originalCount = messages.length;

    if (originalCount === 0) {
      return {
        messages: [],
        diagnostics: {
          originalMessageCount: 0,
          prunedMessageCount: 0,
          systemMessageCount: 0,
          conversationTurnCount: 0,
          estimatedInputTokens: 0,
          maxInputTokens: budget.maxInputTokens,
          availableHistoryTokens: budget.availableHistoryTokens,
          isPruned: false,
          userMessageExceedsBudget: false,
        },
      };
    }

    // 1. Separate System messages from Conversation messages
    const systemMessages: { role: string; content: string }[] = [];
    const conversationMessages: { role: string; content: string }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessages.push(msg);
      } else {
        conversationMessages.push(msg);
      }
    }

    const systemTokens = systemMessages.reduce(
      (sum, m) => sum + this.tokenEstimator.estimateTokens(m.content),
      0
    );

    // Dynamic budget for conversation turns after deducting real system prompt size
    const budgetForHistory = Math.max(256, budget.maxInputTokens - systemTokens);

    if (conversationMessages.length === 0) {
      return {
        messages: [...systemMessages],
        diagnostics: {
          originalMessageCount: originalCount,
          prunedMessageCount: systemMessages.length,
          systemMessageCount: systemMessages.length,
          conversationTurnCount: 0,
          estimatedInputTokens: systemTokens,
          maxInputTokens: budget.maxInputTokens,
          availableHistoryTokens: budgetForHistory,
          isPruned: false,
          userMessageExceedsBudget: false,
        },
      };
    }

    // 2. Identify the mandatory current request (last message in conversation)
    const currentMessage = conversationMessages[conversationMessages.length - 1];
    const currentMessageTokens = this.tokenEstimator.estimateTokens(currentMessage.content);
    const userMessageExceedsBudget = currentMessageTokens > budgetForHistory;

    // 3. Scan prior conversation backwards and collect turn pairs
    let usedTokens = currentMessageTokens;
    const priorHistoryToInclude: { role: string; content: string }[] = [];

    let i = conversationMessages.length - 2;
    while (i >= 0) {
      const msg = conversationMessages[i];

      // Check if we have an Assistant response preceded by a User turn
      if (msg.role === 'assistant' && i > 0 && conversationMessages[i - 1].role === 'user') {
        const userTurn = conversationMessages[i - 1];
        const pairTokens =
          this.tokenEstimator.estimateTokens(msg.content) +
          this.tokenEstimator.estimateTokens(userTurn.content);

        if (usedTokens + pairTokens <= budgetForHistory) {
          priorHistoryToInclude.unshift(userTurn, msg);
          usedTokens += pairTokens;
          i -= 2;
          continue;
        }
      }

      // Single message turn check (e.g. initial user message or unpaired message)
      const singleTokens = this.tokenEstimator.estimateTokens(msg.content);
      if (usedTokens + singleTokens <= budgetForHistory) {
        priorHistoryToInclude.unshift(msg);
        usedTokens += singleTokens;
        i -= 1;
      } else {
        // Budget limit reached; stop accumulating older history
        break;
      }
    }

    // 4. Reassemble final request-time messages in strict chronological order
    const finalHistory = [...priorHistoryToInclude, currentMessage];
    const finalMessages = [...systemMessages, ...finalHistory];
    const finalEstimatedTokens = systemTokens + usedTokens;
    const isPruned = finalMessages.length < originalCount;

    return {
      messages: finalMessages,
      diagnostics: {
        originalMessageCount: originalCount,
        prunedMessageCount: finalMessages.length,
        systemMessageCount: systemMessages.length,
        conversationTurnCount: finalHistory.length,
        estimatedInputTokens: finalEstimatedTokens,
        maxInputTokens: budget.maxInputTokens,
        availableHistoryTokens: budgetForHistory,
        isPruned,
        userMessageExceedsBudget,
      },
    };
  }

  getDefaultConfig(): Required<ContextBudgetConfig> {
    return { ...this.defaultConfig };
  }

  updateDefaultConfig(updates: Partial<ContextBudgetConfig>) {
    this.defaultConfig = {
      ...this.defaultConfig,
      ...updates,
    };
  }

  setTokenEstimator(estimator: ITokenEstimator) {
    this.tokenEstimator = estimator;
  }
}

export const contextBudgetService = new ContextBudgetService();
