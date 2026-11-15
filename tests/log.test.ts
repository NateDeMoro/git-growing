import { describe, expect, it } from "vitest";
import type { LogEntry } from "../src/lib/contract";
import { CSV_HEADER, LOG_CAP, createLogStore, csvField, toCsv } from "../src/lib/log";

function entry(i: number, over: Partial<LogEntry> = {}): LogEntry {
  return {
    time: `2026-11-15T${String(i % 24).padStart(2, "0")}:00:00-07:00`,
    loggedAt: "2026-11-15T12:00:00-07:00",
    mode: "sim",
    status: "GO",
    statusChanged: false,
    productId: "abamectin",
    recommendedDroplet: "VF",
    triggers: [],
    lowerTempF: 70,
    upperTempF: 71,
    lowerWindMph: 5,
    upperWindMph: 6,
    lowerDirDeg: 10,
    upperDirDeg: 20,
    deltaTC: 5,
    rainInHr: 0,
    ...over,
  };
}

describe("csv", () => {
  it("quotes a field with comma, quote and newline", () => {
    expect(csvField('a,b "x"\nc')).toBe('"a,b ""x""\nc"');
  });
  it("leaves a plain field unquoted", () => {
    expect(csvField("plain text")).toBe("plain text");
  });
  it("writes a fixed header and reasons in one cell", () => {
    const csv = toCsv([entry(1, { triggers: ["one, two", "three"] })]);
    const [head, row] = csv.split("\n");
    expect(head).toBe(CSV_HEADER.join(","));
    expect(row).toContain('"one, two; three"');
  });
});

describe("log store", () => {
  it("falls back to memory when localStorage throws on get and set", () => {
    const bad = {
      getItem() { throw new Error("no get"); },
      setItem() { throw new Error("no set"); },
    } as unknown as Storage;
    const s = createLogStore(() => bad);
    s.append(entry(1));
    expect(s.getAll()).toHaveLength(1);
  });
  it("caps at 5000 entries, dropping the oldest", () => {
    const s = createLogStore(() => null);
    for (let i = 0; i < LOG_CAP + 10; i++) s.append(entry(i, { productId: `p${i}` }));
    const all = s.getAll();
    expect(all).toHaveLength(LOG_CAP);
    expect(all[0].productId).toBe("p10");
  });
  it("clear empties the store and notifies", () => {
    const s = createLogStore(() => null);
    let n = 0;
    s.subscribe(() => n++);
    s.append(entry(1));
    s.clear();
    expect(s.getAll()).toHaveLength(0);
    expect(n).toBe(2);
  });
});
