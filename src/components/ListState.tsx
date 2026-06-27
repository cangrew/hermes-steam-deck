import type { ReactNode } from "react";
import { FocusableButton } from "../input/focusables";
import { useStore } from "../state/store";

/** Shared loading / error / not-connected / empty wrapper for list screens. */
export function ListState({
  loading,
  error,
  empty,
  emptyText,
  reload,
  children,
}: {
  loading: boolean;
  error?: string;
  empty: boolean;
  emptyText: string;
  reload?: () => void;
  children: ReactNode;
}) {
  const connected = useStore((s) => s.connection.status === "connected");
  const setScreen = useStore((s) => s.setScreen);

  if (!connected) {
    return (
      <div className="list-state">
        <p>Not connected.</p>
        <FocusableButton autoFocus onPress={() => setScreen("settings")}>
          Open Settings
        </FocusableButton>
      </div>
    );
  }
  if (loading) return <div className="list-state">Loading…</div>;
  if (error)
    return (
      <div className="list-state error-box">
        {error}
        {reload && (
          <div style={{ marginTop: 12 }}>
            <FocusableButton autoFocus onPress={reload}>
              Retry
            </FocusableButton>
          </div>
        )}
      </div>
    );
  if (empty) return <div className="list-state">{emptyText}</div>;
  return <>{children}</>;
}
