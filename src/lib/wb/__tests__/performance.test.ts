import {
  calcPressureAlt,
  calcISATemp,
  calcDensityAlt,
  calcISADeviation,
  getDensityAltWarning,
} from "../performance";

describe("calcPressureAlt", () => {
  it("returns field elevation at standard pressure", () => {
    expect(calcPressureAlt(5000, 29.92)).toBe(5000);
  });

  it("increases with low pressure", () => {
    // (29.92 - 29.82) * 1000 + 5000 = 5100
    expect(calcPressureAlt(5000, 29.82)).toBe(5100);
  });

  it("decreases with high pressure", () => {
    // (29.92 - 30.12) * 1000 + 5000 = 4800
    expect(calcPressureAlt(5000, 30.12)).toBe(4800);
  });

  it("works at sea level", () => {
    expect(calcPressureAlt(0, 29.92)).toBe(0);
  });
});

describe("calcISATemp", () => {
  it("returns 15°C at sea level", () => {
    expect(calcISATemp(0)).toBe(15);
  });

  it("decreases 2°C per 1000ft", () => {
    expect(calcISATemp(5000)).toBe(5);
    expect(calcISATemp(10000)).toBe(-5);
  });

  it("works at high altitude", () => {
    expect(calcISATemp(20000)).toBe(-25);
  });
});

describe("calcDensityAlt", () => {
  it("equals pressure alt at standard temperature", () => {
    // At 5000ft PA, ISA = 5°C. If OAT = 5°C, DA = 5000
    expect(calcDensityAlt(5000, 5)).toBe(5000);
  });

  it("increases with above-standard temperature", () => {
    // At 5000ft PA, ISA = 5°C. OAT = 25°C → deviation = +20
    // DA = 5000 + 120 * 20 = 7400
    expect(calcDensityAlt(5000, 25)).toBe(7400);
  });

  it("decreases with below-standard temperature", () => {
    // At 5000ft PA, ISA = 5°C. OAT = -5°C → deviation = -10
    // DA = 5000 + 120 * (-10) = 3800
    expect(calcDensityAlt(5000, -5)).toBe(3800);
  });

  it("works at sea level standard day", () => {
    expect(calcDensityAlt(0, 15)).toBe(0);
  });
});

describe("calcISADeviation", () => {
  it("returns 0 at standard conditions", () => {
    expect(calcISADeviation(5000, 5)).toBe(0);
    expect(calcISADeviation(0, 15)).toBe(0);
  });

  it("returns positive for above standard", () => {
    expect(calcISADeviation(5000, 25)).toBe(20);
  });

  it("returns negative for below standard", () => {
    expect(calcISADeviation(5000, -5)).toBe(-10);
  });
});

describe("getDensityAltWarning", () => {
  it("returns normal below 5000ft", () => {
    expect(getDensityAltWarning(0)).toBe("normal");
    expect(getDensityAltWarning(4999)).toBe("normal");
  });

  it("returns caution at 5000-7999ft", () => {
    expect(getDensityAltWarning(5000)).toBe("caution");
    expect(getDensityAltWarning(7999)).toBe("caution");
  });

  it("returns warning at 8000ft+", () => {
    expect(getDensityAltWarning(8000)).toBe("warning");
    expect(getDensityAltWarning(12000)).toBe("warning");
  });
});
