import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAuthenticatedUser } = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
}));

function loadPageModule(relativePath, mockMap) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const source = readFileSync(filePath, "utf8");
  const { code } = transformSync(source, {
    loader: "jsx",
    format: "cjs",
    jsx: "automatic",
    target: "es2020",
    sourcefile: filePath,
  });
  const compiledModule = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier in mockMap) {
      return mockMap[specifier];
    }

    return require(specifier);
  };
  const script = new vm.Script(`(function(require,module,exports){${code}\n})`, {
    filename: filePath,
  });

  script.runInThisContext()(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

describe("checkout page auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires an authenticated user before rendering checkout", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "user_customer",
      name: "MiniShop Customer",
      email: "customer@minishop.local",
      role: "CUSTOMER",
    });

    const { default: CheckoutPage } = loadPageModule("src/app/checkout/page.js", {
      "@/lib/auth": { requireAuthenticatedUser },
      "@/components/checkout-page-content": { CheckoutPageContent: "checkout-page-content" },
    });

    await CheckoutPage();

    expect(requireAuthenticatedUser).toHaveBeenCalledWith({
      nextPath: "/checkout",
    });
  });
});
