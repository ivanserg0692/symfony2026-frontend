import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppThemeProvider, useAppTheme } from "../../../src/providers/theme-provider";

describe("application theme", () => {
  let root: Root;
  let container: HTMLDivElement;
  let dark: boolean;
  let listener: (() => void) | undefined;
  const removeListener = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    dark = true;
    listener = undefined;
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      get matches() { return dark; },
      addEventListener: (_: string, callback: () => void) => { listener = callback; },
      removeEventListener: removeListener,
    })));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    expect(removeListener).toHaveBeenCalledWith("change", listener);
    container.remove();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const mount = async () => {
    const Probe = () => {
      const { theme, preference, setTheme, toggleTheme } = useAppTheme();
      return <>
        <output>{preference}:{theme}</output>
        <button onClick={() => setTheme("light")}>Light</button>
        <button onClick={() => setTheme("system")}>System</button>
        <button onClick={toggleTheme}>Toggle</button>
      </>;
    };
    await act(async () => root.render(<AppThemeProvider><Probe /></AppThemeProvider>));
  };

  it("follows OS changes in System mode and stops overriding an explicit selection", async () => {
    await mount();
    expect(container.querySelector("output")?.textContent).toBe("system:dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    await act(async () => { dark = false; listener?.(); });
    expect(document.documentElement.dataset.theme).toBe("light");
    await act(async () => container.querySelectorAll("button")[0].click());
    await act(async () => { dark = true; listener?.(); });
    expect(container.querySelector("output")?.textContent).toBe("light:light");
    expect(localStorage.getItem("app-theme")).toBe("light");
    await act(async () => container.querySelectorAll("button")[1].click());
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("app-theme")).toBe("system");
  });

  it("preserves saved Light/Dark choices and the existing toggle API", async () => {
    localStorage.setItem("app-theme", "dark");
    dark = false;
    await mount();
    expect(container.querySelector("output")?.textContent).toBe("dark:dark");
    await act(async () => container.querySelectorAll("button")[2].click());
    expect(container.querySelector("output")?.textContent).toBe("light:light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("continues working if browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    await mount();
    await act(async () => container.querySelectorAll("button")[0].click());
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
