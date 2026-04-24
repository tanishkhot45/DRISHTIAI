"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SelectionResult } from "@/lib/types";

type State = {
  lastResult: SelectionResult | null;
  setLastResult: (r: SelectionResult) => void;
  reset: () => void;

  compareIds: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
};

export const useSpecStore = create<State>()(
  persist(
    (set, get) => ({
      lastResult: null,

      setLastResult: (r) =>
        set({
          lastResult: r,
          compareIds: [],
        }),

      reset: () =>
        set({
          lastResult: null,
          compareIds: [],
        }),

      compareIds: [],

      toggleCompare: (id) => {
        const current = get().compareIds;

        if (current.includes(id)) {
          set({ compareIds: current.filter((x) => x !== id) });
        } else if (current.length < 4) {
          set({ compareIds: [...current, id] });
        }
      },

      clearCompare: () => set({ compareIds: [] }),
    }),
    {
      name: "drishti-compare",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        compareIds: state.compareIds,
      }),
    }
  )
);