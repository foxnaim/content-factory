import { describe, expect, it } from "vitest";
import { deriveBatchStatus } from "../src/batch-status.js";

describe("deriveBatchStatus", () => {
  it("tracks queued, processing and review phases", () => {
    expect(deriveBatchStatus({ draft: 9, queued: 1 }, 10)).toBe("queued");
    expect(deriveBatchStatus({ ready_for_review: 2, rendering: 1, draft: 7 }, 10)).toBe("processing");
    expect(deriveBatchStatus({ ready_for_review: 2, draft: 8 }, 10)).toBe("review");
  });

  it("finishes only when every item is terminal", () => {
    expect(deriveBatchStatus({ approved: 8, rejected: 2 }, 10)).toBe("completed");
    expect(deriveBatchStatus({ approved: 9, failed: 1 }, 10)).toBe("failed");
  });
});
