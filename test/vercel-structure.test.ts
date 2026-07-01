import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel deployment structure", () => {
  it("keeps the Next.js App Router at the repository root", () => {
    for (const requiredPath of [
      "app/layout.tsx",
      "app/page.tsx",
      "app/globals.css",
      "app/providers.tsx",
      "package.json",
      "next.config.ts",
      "vercel.json",
    ]) {
      expect(existsSync(requiredPath), `${requiredPath} is required`).toBe(true);
    }
  });

  it("uses the standard Vercel Next.js build configuration", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      framework?: string;
      buildCommand?: string;
    };

    expect(packageJson.dependencies?.next).toBeTruthy();
    expect(packageJson.scripts?.build).toBe("next build");
    expect(vercel.framework).toBe("nextjs");
    expect(vercel.buildCommand).toBe("npm run build");
  });
});
