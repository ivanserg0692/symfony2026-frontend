import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Refine, useList } from "@refinedev/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dataProviders } from "../../../src/providers/data-provider";
import { API_URL } from "../../../src/lib/api-client";
import { json, mockApi } from "./api-mock";

describe("Refine provider selection", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  const mountList = async (params: Parameters<typeof useList>[0]) => {
    let latest: ReturnType<typeof useList> | undefined;
    const Probe = () => {
      latest = useList(params);
      return null;
    };
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(createElement(Refine, {
        dataProvider: dataProviders,
        options: { disableTelemetry: true },
      }, createElement(Probe)));
    });
    await act(async () => {
      await vi.waitFor(() => expect(latest?.query.isSuccess).toBe(true));
    });
    return latest!;
  };

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove();
    root = undefined;
    vi.unstubAllGlobals();
  });

  it("uses the named catalog provider for the sections array", async () => {
    const sections = [{ id: 1, name: "Section" }];
    const fetchMock = mockApi(() => json(sections));
    const result = await mountList({
      resource: "catalog/sections",
      dataProviderName: "catalog",
      pagination: { mode: "off" },
    });

    expect(result.result).toMatchObject({ data: sections, total: 1 });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/catalog/sections`, expect.anything());
  });

  it("keeps existing hooks on the default provider without dataProviderName", async () => {
    const news = [{ id: 2, title: "News" }];
    mockApi(() => json({ items: news }));
    const result = await mountList({ resource: "news" });

    expect(result.result).toMatchObject({ data: news, total: 1 });
  });
});
