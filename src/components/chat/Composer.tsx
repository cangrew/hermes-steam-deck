import { useRef, useState } from "react";
import { FocusableButton, FocusableField, FocusSection } from "../../input/focusables";
import { useStore } from "../../state/store";

/** Reads a File into a data: URL for inline image input. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Composer() {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const sendMessage = useStore((s) => s.sendMessage);
  const stopStreaming = useStore((s) => s.stopStreaming);
  const isStreaming = useStore((s) => s.isStreaming);
  const connected = useStore((s) => s.connection.status === "connected");

  // `value` is supplied when submitted from the on-screen keyboard (whose
  // captured closure would otherwise see stale text); the Send button calls
  // with no argument and uses the live state.
  const submit = (value?: string) => {
    const content = value ?? text;
    if (!content.trim() || isStreaming) return;
    void sendMessage(content, images.length ? images : undefined);
    setText("");
    setImages([]);
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files) return;
    const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
    setImages((prev) => [...prev, ...urls]);
  };

  return (
    <FocusSection className="composer" focusKey="composer">
      {images.length > 0 && (
        <div className="composer-thumbs">
          {images.map((src, i) => (
            <div className="thumb" key={i}>
              <img src={src} alt="attachment" />
              <FocusableButton
                className="thumb-x"
                onPress={() => setImages((p) => p.filter((_, j) => j !== i))}
              >
                ✕
              </FocusableButton>
            </div>
          ))}
        </div>
      )}
      <div className="composer-row">
        <FocusableButton
          className="composer-attach"
          title="Attach image"
          onPress={() => fileRef.current?.click()}
          disabled={!connected}
        >
          ＋
        </FocusableButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void onPickFiles(e.target.files)}
        />
        <FocusableField
          className="composer-input"
          focusKey="composer-input"
          value={text}
          onChange={setText}
          onSubmit={submit}
          placeholder={connected ? "Message Hermes…" : "Connect in Settings first"}
          label="Message"
          multiline
        />
        {isStreaming ? (
          <FocusableButton className="composer-send stop" onPress={() => void stopStreaming()}>
            ■ Stop
          </FocusableButton>
        ) : (
          <FocusableButton
            className="composer-send"
            onPress={submit}
            disabled={!connected || !text.trim()}
          >
            Send ▶
          </FocusableButton>
        )}
      </div>
    </FocusSection>
  );
}
