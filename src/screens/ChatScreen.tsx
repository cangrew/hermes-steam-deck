import { useEffect, useRef } from "react";
import { Composer } from "../components/chat/Composer";
import { MessageBubble } from "../components/chat/MessageBubble";
import { FocusableButton, FocusSection } from "../input/focusables";
import { useStore } from "../state/store";

function ApprovalPrompt() {
  const approval = useStore((s) => s.pendingApproval);
  const resolve = useStore((s) => s.resolveApproval);
  if (!approval) return null;
  return (
    <FocusSection className="approval" boundary focusKey="approval">
      <div className="approval-title">⚠ Hermes wants to run a tool</div>
      {approval.toolName && <div className="approval-tool">{approval.toolName}</div>}
      {approval.detail && <pre className="approval-detail">{approval.detail}</pre>}
      <div className="approval-actions">
        <FocusableButton
          className="approve"
          autoFocus
          onPress={() => void resolve("approve")}
        >
          Approve
        </FocusableButton>
        <FocusableButton className="deny" onPress={() => void resolve("deny")}>
          Deny
        </FocusableButton>
      </div>
    </FocusSection>
  );
}

export function ChatScreen() {
  const messages = useStore((s) => s.messages);
  const connected = useStore((s) => s.connection.status === "connected");
  const setScreen = useStore((s) => s.setScreen);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as tokens stream in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="screen chat-screen">
      <div className="scroll-region messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty">
            <h2>Talk to your Hermes agent</h2>
            {connected ? (
              <p>Type a message below. Hermes can use tools, remember context, and run tasks.</p>
            ) : (
              <FocusSection className="empty-cta" focusKey="empty-cta">
                <p>Not connected to a Hermes API server yet.</p>
                <FocusableButton autoFocus onPress={() => setScreen("settings")}>
                  Open Settings
                </FocusableButton>
              </FocusSection>
            )}
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        <ApprovalPrompt />
      </div>
      <Composer />
    </div>
  );
}
