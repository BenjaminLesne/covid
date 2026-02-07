"use client";

import { describe, expect, it, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "./use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns defaultValue when localStorage is empty", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default")
    );
    expect(result.current[0]).toBe("default");
  });

  it("returns stored value when localStorage has data", () => {
    localStorage.setItem("test-key", JSON.stringify("stored"));
    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default")
    );
    expect(result.current[0]).toBe("stored");
  });

  it("writes to localStorage when setValue is called", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default")
    );
    act(() => {
      result.current[1]("new-value");
    });
    expect(result.current[0]).toBe("new-value");
    expect(JSON.parse(localStorage.getItem("test-key")!)).toBe("new-value");
  });

  it("supports functional updates", () => {
    const { result } = renderHook(() =>
      useLocalStorage("counter", 0)
    );
    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    expect(result.current[0]).toBe(1);
    act(() => {
      result.current[1]((prev) => prev + 5);
    });
    expect(result.current[0]).toBe(6);
  });

  it("handles complex objects", () => {
    const defaultObj = { stations: ["national"], theme: "system" };
    const { result } = renderHook(() =>
      useLocalStorage("prefs", defaultObj)
    );
    expect(result.current[0]).toEqual(defaultObj);

    const updated = { stations: ["national", "station-1"], theme: "dark" };
    act(() => {
      result.current[1](updated);
    });
    expect(result.current[0]).toEqual(updated);
    expect(JSON.parse(localStorage.getItem("prefs")!)).toEqual(updated);
  });

  it("handles arrays", () => {
    const { result } = renderHook(() =>
      useLocalStorage<string[]>("list", ["a"])
    );
    act(() => {
      result.current[1]((prev) => [...prev, "b", "c"]);
    });
    expect(result.current[0]).toEqual(["a", "b", "c"]);
  });

  it("recovers from corrupted localStorage data", () => {
    localStorage.setItem("bad-key", "not valid json{{{");
    const { result } = renderHook(() =>
      useLocalStorage("bad-key", "fallback")
    );
    expect(result.current[0]).toBe("fallback");
  });

  it("persists across re-renders with same key", () => {
    const { result, rerender } = renderHook(() =>
      useLocalStorage("persist-key", "initial")
    );
    act(() => {
      result.current[1]("updated");
    });
    rerender();
    expect(result.current[0]).toBe("updated");
  });
});
