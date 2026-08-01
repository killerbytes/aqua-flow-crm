import React from "react";

export type ToggleState = Record<string, boolean | undefined>;

export type ToggleUpdater =
  | Partial<ToggleState>
  | ((prev: ToggleState) => ToggleState);

type UseToggleResult = [ToggleState, (updater: ToggleUpdater) => void] & {
  toggle: ToggleState;
  handleToggle: (updater: ToggleUpdater) => void;
};

export default function useToggle(initialState: ToggleState): UseToggleResult {
  const [toggle, setToggle] = React.useState<ToggleState>(initialState);

  const handleToggle = React.useCallback((updater: ToggleUpdater) => {
    setToggle((prev) =>
      typeof updater === "function" ? updater(prev) : { ...prev, ...updater },
    );
  }, []);

  return Object.assign([toggle, handleToggle], {
    toggle,
    handleToggle,
  }) as UseToggleResult;
}
