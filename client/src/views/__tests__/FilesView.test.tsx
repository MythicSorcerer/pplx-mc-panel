import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { FilesView } from "../FilesView";

type Entry = { name: string; type: "file" | "dir"; size: number | null; modified: string };

const baseEntries: Entry[] = [
  { name: "docs", type: "dir", size: null, modified: "2024-01-01" },
  { name: "readme.txt", type: "file", size: 1234, modified: "2024-01-02" },
];

function mockFetchWithEntries(entries: Entry[]) {
  const json = vi.fn().mockResolvedValue({ ok: true, entries });
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("delete mode shows checkboxes and bulk action buttons", async () => {
  mockFetchWithEntries(baseEntries);
  render(<FilesView />);

  await screen.findByText("readme.txt");

  fireEvent.click(screen.getByRole("button", { name: /delete mode/i }));

  expect(screen.getByRole("checkbox", { name: "Select docs" })).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Select readme.txt" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /delete selected/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
});

test("delete mode hides row edit and delete icons", async () => {
  mockFetchWithEntries(baseEntries);
  render(<FilesView />);

  await screen.findByText("readme.txt");
  fireEvent.click(screen.getByRole("button", { name: /delete mode/i }));

  expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();
  expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
});

test("emoji click expands directory and loads children", async () => {
  const childEntries: Entry[] = [
    { name: "guide.md", type: "file", size: 42, modified: "2024-02-01" },
  ];
  const jsonRoot = vi.fn().mockResolvedValue({ ok: true, entries: baseEntries });
  const jsonChild = vi.fn().mockResolvedValue({ ok: true, entries: childEntries });
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: jsonRoot } as unknown as Response)
    .mockResolvedValueOnce({ ok: true, status: 200, json: jsonChild } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

  render(<FilesView />);

  await screen.findByText("docs");
  fireEvent.click(screen.getByRole("button", { name: /delete mode/i }));

  fireEvent.click(screen.getByRole("button", { name: "Expand" }));

  expect(await screen.findByText("guide.md")).toBeInTheDocument();
});
