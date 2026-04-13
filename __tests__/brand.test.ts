/**
 * Brand identity smoke tests.
 */
import { BRAND } from "../src/brand";

describe("BRAND", () => {
  it("has the correct name", () => {
    expect(BRAND.name).toBe("ALLOUL&Q");
  });
  it("has primary color", () => {
    expect(BRAND.colors.primary).toMatch(/^#/);
  });
  it("has required logo assets", () => {
    expect(BRAND.logos.dark).toBeDefined();
    expect(BRAND.logos.light).toBeDefined();
    expect(BRAND.logos.iconOnly).toBeDefined();
  });
});
