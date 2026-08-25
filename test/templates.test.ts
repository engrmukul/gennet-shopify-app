import { describe, expect, it } from "vitest";
import { renderTemplate, validateTemplate } from "~/lib/templates.server";

describe("whitelist template renderer", () => {
  const variables = {
    order_number: "#1001",
    order_status: "paid",
    order_total: "49.99",
    currency: "USD",
    shop_name: "Test Shop",
  };

  it("substitutes only whitelisted variables", () => {
    const rendered = renderTemplate(
      "Order {order_number} from {shop_name} is {order_status} ({order_total} {currency}).",
      variables,
    );
    expect(rendered).toBe("Order #1001 from Test Shop is paid (49.99 USD).");
  });

  it("leaves an unknown/unapproved variable as literal text instead of executing it", () => {
    const rendered = renderTemplate("Hi {first_name}, order {order_number}!", variables);
    expect(rendered).toBe("Hi {first_name}, order #1001!");
  });

  it("does not evaluate arbitrary expressions", () => {
    const rendered = renderTemplate("{constructor} {order_number}", variables);
    expect(rendered).toBe("{constructor} #1001");
  });

  it("flags unknown variables during template validation", () => {
    const result = validateTemplate("Hello {first_name}, {order_number}");
    expect(result.valid).toBe(false);
    expect(result.unknownVariables).toEqual(["first_name"]);
  });

  it("passes validation when only whitelisted variables are used", () => {
    const result = validateTemplate("{order_number} {order_status} {order_total} {currency} {shop_name}");
    expect(result.valid).toBe(true);
  });
});
