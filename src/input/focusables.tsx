import {
  type ReactNode,
  type CSSProperties,
  useEffect,
} from "react";
import {
  FocusContext,
  useFocusable,
} from "@noriginmedia/norigin-spatial-navigation";
import { useOsk } from "../state/osk";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  focusKey?: string;
  autoFocus?: boolean;
  title?: string;
}

/** A spatial-navigation focusable button. Works with gamepad A, Enter, mouse and touch. */
export function FocusableButton({
  onPress,
  children,
  className,
  style,
  disabled,
  focusKey,
  autoFocus,
  title,
}: ButtonProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusable: !disabled,
    focusKey,
    onEnterPress: () => onPress?.(),
  });

  useEffect(() => {
    if (autoFocus && !disabled) focusSelf();
  }, [autoFocus, disabled, focusSelf]);

  return (
    <button
      ref={ref}
      type="button"
      title={title}
      disabled={disabled}
      onClick={() => onPress?.()}
      style={style}
      className={cx("focusable", "btn", focused && "focused", className)}
    >
      {children}
    </button>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  focusKey?: string;
  /** Trap navigation inside this section (used by modals / the keyboard). */
  boundary?: boolean;
}

/** Groups focusables and remembers the last focused child. */
export function FocusSection({
  children,
  className,
  style,
  focusKey,
  boundary,
}: SectionProps) {
  const { ref, focusKey: fk } = useFocusable({
    focusKey,
    saveLastFocusedChild: true,
    trackChildren: true,
    isFocusBoundary: boundary,
  });
  return (
    <FocusContext.Provider value={fk}>
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    </FocusContext.Provider>
  );
}

interface FieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  password?: boolean;
  className?: string;
  focusKey?: string;
  onSubmit?: (value: string) => void;
}

/**
 * A text field that opens the built-in on-screen keyboard when activated, but
 * also accepts direct typing from a hardware / Steam keyboard. The single
 * source of truth is the controlled `value`.
 */
export function FocusableField({
  value,
  onChange,
  placeholder,
  label,
  multiline,
  password,
  className,
  focusKey,
  onSubmit,
}: FieldProps) {
  const openKeyboard = useOsk((s) => s.openKeyboard);
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => open(),
  });

  const open = () =>
    openKeyboard({ value, label, multiline, onChange, onSubmit, returnFocusKey: focusKey });

  const display = password && value ? "•".repeat(value.length) : value;

  return (
    <div
      ref={ref}
      role="textbox"
      tabIndex={0}
      onClick={open}
      className={cx("focusable", "field", focused && "focused", className)}
    >
      {label && <span className="field-label">{label}</span>}
      <span className={cx("field-value", !value && "placeholder")}>
        {display || placeholder || " "}
      </span>
    </div>
  );
}
