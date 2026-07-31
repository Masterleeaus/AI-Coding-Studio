import { beforeEach, describe, expect, it } from "vitest";
import {
  clearConversationBudget,
  estimateDeepSeekTokens,
  getConversationContextEstimate,
  recordProviderRequestContext,
} from "./context-budget.js";

const CONVERSATION_A = "conversation-a";
const CONVERSATION_B = "conversation-b";

beforeEach(() => {
  clearConversationBudget(CONVERSATION_A);
  clearConversationBudget(CONVERSATION_B);
});

describe("recordProviderRequestContext", () => {
  it("records a visible provider prompt once", () => {
    const userPrompt = "Analyze the repository architecture.";

    const estimate = recordProviderRequestContext({
      conversationId: CONVERSATION_A,
      userPrompt,
      label: "provider request",
    });

    expect(estimate).toBe(estimateDeepSeekTokens(userPrompt));
    expect(getConversationContextEstimate(CONVERSATION_A)).toBe(estimate);
  });

  it("combines hidden and visible request text exactly once", () => {
    const injectedText = "<BetterDeepSeek>Hidden instructions</BetterDeepSeek>";
    const userPrompt = "Continue with step two.";
    const expectedText = `${injectedText}\n\n${userPrompt}`;

    recordProviderRequestContext({
      conversationId: CONVERSATION_A,
      injectedText,
      userPrompt,
      label: "provider request",
    });

    expect(getConversationContextEstimate(CONVERSATION_A))
      .toBe(estimateDeepSeekTokens(expectedText));
  });

  it("ignores an empty provider request", () => {
    expect(recordProviderRequestContext({
      conversationId: CONVERSATION_A,
      injectedText: "",
      userPrompt: "",
    })).toBe(0);
    expect(getConversationContextEstimate(CONVERSATION_A)).toBe(0);
  });

  it("keeps conversation ledgers isolated", () => {
    recordProviderRequestContext({
      conversationId: CONVERSATION_A,
      userPrompt: "A",
    });
    recordProviderRequestContext({
      conversationId: CONVERSATION_B,
      userPrompt: "BBBB",
    });

    expect(getConversationContextEstimate(CONVERSATION_A))
      .toBe(estimateDeepSeekTokens("A"));
    expect(getConversationContextEstimate(CONVERSATION_B))
      .toBe(estimateDeepSeekTokens("BBBB"));
  });

  it("clears the recorded request context", () => {
    recordProviderRequestContext({
      conversationId: CONVERSATION_A,
      injectedText: "hidden",
      userPrompt: "visible",
    });

    clearConversationBudget(CONVERSATION_A);

    expect(getConversationContextEstimate(CONVERSATION_A)).toBe(0);
  });
});
