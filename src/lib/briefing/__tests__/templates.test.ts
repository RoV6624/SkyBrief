import { getDefaultTemplate, validateAgainstTemplate } from "../templates";

describe("getDefaultTemplate", () => {
  it("returns a valid template for local flights", () => {
    const template = getDefaultTemplate("local");
    expect(template.id).toBe("default-local");
    expect(template.name).toBe("Local VFR Flight");
    expect(template.flightType).toBe("local");
    expect(template.requiredItems.length).toBe(9);
    expect(template.maxFratScore).toBe(25);
    expect(template.requireMinimumsPass).toBe(true);
  });

  it("returns XC template with more items", () => {
    const template = getDefaultTemplate("xc");
    expect(template.requiredItems.length).toBeGreaterThan(9);
    expect(template.requiredItems).toContain("alternate");
    expect(template.requiredItems).toContain("performance");
    expect(template.maxFratScore).toBe(20);
  });

  it("returns night template", () => {
    const template = getDefaultTemplate("night");
    expect(template.requiredItems).toContain("equipment");
    expect(template.maxFratScore).toBe(20);
  });

  it("returns instrument template", () => {
    const template = getDefaultTemplate("instrument");
    expect(template.requiredItems).toContain("equipment");
    expect(template.requiredItems).toContain("alternate");
    expect(template.maxFratScore).toBe(30);
  });

  it("returns checkride template with lowest max FRAT", () => {
    const template = getDefaultTemplate("checkride");
    expect(template.maxFratScore).toBe(15);
    expect(template.requiredItems).toContain("performance");
  });

  it("all templates have common required items", () => {
    const types = ["local", "xc", "night", "instrument", "checkride"] as const;
    for (const type of types) {
      const template = getDefaultTemplate(type);
      expect(template.requiredItems).toContain("weather_current");
      expect(template.requiredItems).toContain("frat");
      expect(template.requiredItems).toContain("personal_minimums");
    }
  });
});

describe("validateAgainstTemplate", () => {
  it("validates when all items complete and scores pass", () => {
    const template = getDefaultTemplate("local");
    const result = validateAgainstTemplate(
      template,
      template.requiredItems,
      10,
      true
    );

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("fails when required items are missing", () => {
    const template = getDefaultTemplate("local");
    const result = validateAgainstTemplate(
      template,
      ["weather_current", "fuel_plan"],
      10,
      true
    );

    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain("not completed");
  });

  it("fails when FRAT score exceeds maximum", () => {
    const template = getDefaultTemplate("local");
    const result = validateAgainstTemplate(
      template,
      template.requiredItems,
      30, // exceeds local max of 25
      true
    );

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("FRAT score"))).toBe(true);
  });

  it("fails when minimums check fails", () => {
    const template = getDefaultTemplate("local");
    const result = validateAgainstTemplate(
      template,
      template.requiredItems,
      10,
      false
    );

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("minimums"))).toBe(true);
  });

  it("passes when FRAT score is undefined (not provided)", () => {
    const template = getDefaultTemplate("local");
    const result = validateAgainstTemplate(
      template,
      template.requiredItems,
      undefined,
      true
    );

    expect(result.valid).toBe(true);
  });

  it("accumulates multiple issues", () => {
    const template = getDefaultTemplate("local");
    const result = validateAgainstTemplate(
      template,
      ["weather_current"],
      50,
      false
    );

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBe(3);
  });
});
