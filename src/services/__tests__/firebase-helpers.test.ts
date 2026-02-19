// Mock native modules before any imports
jest.mock("@react-native-firebase/auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    onAuthStateChanged: jest.fn(),
    currentUser: null,
  })),
  GoogleAuthProvider: { credential: jest.fn() },
  EmailAuthProvider: { credential: jest.fn() },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {},
}));

import {
  firestoreValueToJS,
  jsToFirestoreValue,
  mergeFuelPrices,
} from "../firebase";

describe("firestoreValueToJS", () => {
  it("converts stringValue", () => {
    expect(firestoreValueToJS({ stringValue: "hello" })).toBe("hello");
  });

  it("converts integerValue", () => {
    expect(firestoreValueToJS({ integerValue: "42" })).toBe(42);
  });

  it("converts doubleValue", () => {
    expect(firestoreValueToJS({ doubleValue: 3.14 })).toBe(3.14);
  });

  it("converts booleanValue", () => {
    expect(firestoreValueToJS({ booleanValue: true })).toBe(true);
    expect(firestoreValueToJS({ booleanValue: false })).toBe(false);
  });

  it("converts timestampValue to Date", () => {
    const date = firestoreValueToJS({ timestampValue: "2026-02-18T12:00:00Z" });
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe("2026-02-18T12:00:00.000Z");
  });

  it("converts nullValue to null", () => {
    expect(firestoreValueToJS({ nullValue: null })).toBe(null);
  });

  it("returns null for null input", () => {
    expect(firestoreValueToJS(null)).toBe(null);
  });

  it("returns null for undefined input", () => {
    expect(firestoreValueToJS(undefined)).toBe(null);
  });

  it("returns null for unrecognized value type", () => {
    expect(firestoreValueToJS({ unknownType: "foo" })).toBe(null);
  });
});

describe("jsToFirestoreValue", () => {
  it("converts null", () => {
    expect(jsToFirestoreValue(null)).toEqual({ nullValue: null });
  });

  it("converts string", () => {
    expect(jsToFirestoreValue("hello")).toEqual({ stringValue: "hello" });
  });

  it("converts integer", () => {
    expect(jsToFirestoreValue(42)).toEqual({ integerValue: "42" });
  });

  it("converts double", () => {
    expect(jsToFirestoreValue(3.14)).toEqual({ doubleValue: 3.14 });
  });

  it("converts boolean", () => {
    expect(jsToFirestoreValue(true)).toEqual({ booleanValue: true });
  });

  it("converts Date to timestampValue", () => {
    const date = new Date("2026-02-18T12:00:00Z");
    const result = jsToFirestoreValue(date);
    expect(result).toEqual({ timestampValue: date.toISOString() });
  });

  it("returns nullValue for unsupported types", () => {
    expect(jsToFirestoreValue(undefined)).toEqual({ nullValue: null });
  });
});

describe("round-trip: jsToFirestoreValue -> firestoreValueToJS", () => {
  it("round-trips string", () => {
    expect(firestoreValueToJS(jsToFirestoreValue("test"))).toBe("test");
  });

  it("round-trips integer", () => {
    expect(firestoreValueToJS(jsToFirestoreValue(99))).toBe(99);
  });

  it("round-trips double", () => {
    expect(firestoreValueToJS(jsToFirestoreValue(6.28))).toBe(6.28);
  });

  it("round-trips boolean", () => {
    expect(firestoreValueToJS(jsToFirestoreValue(false))).toBe(false);
  });

  it("round-trips null", () => {
    expect(firestoreValueToJS(jsToFirestoreValue(null))).toBe(null);
  });

  it("round-trips Date (within 1 second)", () => {
    const date = new Date("2026-01-15T08:30:00Z");
    const result = firestoreValueToJS(jsToFirestoreValue(date));
    expect(result).toBeInstanceOf(Date);
    expect(Math.abs(result.getTime() - date.getTime())).toBeLessThan(1000);
  });
});

describe("mergeFuelPrices", () => {
  it("returns null when both sources are null", () => {
    expect(mergeFuelPrices("KJFK", null, null)).toBeNull();
  });

  it("returns API data when only API data exists", () => {
    const api = {
      price: 6.5,
      fbo_name: "Atlantic Aviation",
      updated_at: "2026-02-18T10:00:00Z",
    };

    const result = mergeFuelPrices("KJFK", api as any, null);
    expect(result).not.toBeNull();
    expect(result!.source).toBe("api");
    expect(result!.price_100ll).toBe(6.5);
    expect(result!.confidence).toBe("high");
  });

  it("returns user data when only user data exists", () => {
    const user = {
      airport_id: "KJFK",
      price_100ll: 7.0,
      updated_at: new Date(),
      updated_by_uid: "user123",
      fbo_name: "Shell",
    };

    const result = mergeFuelPrices("KJFK", null, user);
    expect(result).not.toBeNull();
    expect(result!.source).toBe("user");
    expect(result!.price_100ll).toBe(7.0);
  });

  it("prefers fresher source when prices agree", () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 3600000);

    const api = {
      price: 6.5,
      fbo_name: "Atlantic",
      updated_at: now.toISOString(),
    };
    const user = {
      airport_id: "KJFK",
      price_100ll: 6.5,
      updated_at: earlier,
      updated_by_uid: "user123",
      fbo_name: "Atlantic",
    };

    const result = mergeFuelPrices("KJFK", api as any, user);
    expect(result!.source).toBe("api");
    expect(result!.confidence).toBe("high");
  });

  it("returns low confidence when prices diverge significantly", () => {
    const now = new Date();

    const api = {
      price: 6.0,
      fbo_name: "Atlantic",
      updated_at: now.toISOString(),
    };
    const user = {
      airport_id: "KJFK",
      price_100ll: 8.0,
      updated_at: now,
      updated_by_uid: "user123",
      fbo_name: "Shell",
    };

    const result = mergeFuelPrices("KJFK", api as any, user);
    expect(result!.source).toBe("merged");
    expect(result!.confidence).toBe("low");
  });
});
