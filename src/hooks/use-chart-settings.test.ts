import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { useChartSettings } from "./use-chart-settings";

describe("useChartSettings", () => {
  it("defaults showUpdates to false", () => {
    const { result } = renderHook(() => useChartSettings(), {
      wrapper: withNuqsTestingAdapter(),
    });
    expect(result.current.showUpdates).toBe(false);
  });

  it("setShowUpdates(true) updates state", async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(() => useChartSettings(), {
      wrapper: withNuqsTestingAdapter({ hasMemory: true, onUrlUpdate }),
    });

    await act(async () => {
      await result.current.setShowUpdates(true);
    });

    expect(result.current.showUpdates).toBe(true);
    expect(onUrlUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        queryString: expect.stringContaining("updates=true"),
      })
    );
  });
});
