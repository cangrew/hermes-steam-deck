import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuggestionBar } from "./SuggestionBar";

// Make the word list resolve synchronously with a small deterministic set.
vi.mock("./predict", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./predict")>();
  const WORDS = ["the", "there", "they", "their", "them"];
  return {
    ...actual,
    loadedWords: () => WORDS,
    loadWords: () => Promise.resolve(WORDS),
  };
});

describe("SuggestionBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders prefix completions for the trailing word", () => {
    render(<SuggestionBar value="the" mode="wheel" onAccept={() => {}} />);
    expect(screen.getByText("there")).toBeInTheDocument();
    expect(screen.getByText("they")).toBeInTheDocument();
  });

  it("renders nothing for password fields", () => {
    const { container } = render(
      <SuggestionBar value="the" password mode="wheel" onAccept={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is no trailing word", () => {
    const { container } = render(
      <SuggestionBar value="the " mode="wheel" onAccept={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("highlights the wheel selection and accepts on click", () => {
    const onAccept = vi.fn();
    render(
      <SuggestionBar value="the" mode="wheel" selectedIndex={1} onAccept={onAccept} />,
    );
    expect(screen.getByText("they").className).toContain("selected");
    screen.getByText("there").click();
    expect(onAccept).toHaveBeenCalledWith("there");
  });

  it("reports the suggestion list to the host", () => {
    const onSuggestions = vi.fn();
    render(
      <SuggestionBar
        value="the"
        mode="wheel"
        onAccept={() => {}}
        onSuggestions={onSuggestions}
      />,
    );
    expect(onSuggestions).toHaveBeenLastCalledWith(["there", "they", "their", "them"]);
  });
});
