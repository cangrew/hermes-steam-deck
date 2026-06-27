import { Markdown } from "../Markdown";
import type { ToolActivity, UiMessage } from "../../state/store";

function ToolRow({ tool }: { tool: ToolActivity }) {
  const icon =
    tool.status === "completed" ? "✓" : tool.status === "started" ? "▶" : "…";
  return (
    <div className={`tool-row tool-${tool.status}`}>
      <span className="tool-icon">{icon}</span>
      <span className="tool-name">{tool.name}</span>
      {tool.detail && <span className="tool-detail">{trim(tool.detail)}</span>}
    </div>
  );
}

function trim(s: string, n = 120) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function MessageBubble({ msg }: { msg: UiMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`msg msg-${msg.role}`}>
      <div className="msg-role">{isUser ? "You" : "Hermes"}</div>
      <div className="msg-body">
        {msg.images && msg.images.length > 0 && (
          <div className="msg-images">
            {msg.images.map((src, i) => (
              <img key={i} src={src} alt="attachment" className="msg-image" />
            ))}
          </div>
        )}

        {msg.tools && msg.tools.length > 0 && (
          <div className="tool-list">
            {msg.tools.map((t) => (
              <ToolRow key={t.id} tool={t} />
            ))}
          </div>
        )}

        {isUser ? (
          <p className="msg-text">{msg.content}</p>
        ) : (
          <Markdown text={msg.content} />
        )}

        {msg.streaming && !msg.content && (!msg.tools || msg.tools.length === 0) && (
          <span className="typing">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
    </div>
  );
}
