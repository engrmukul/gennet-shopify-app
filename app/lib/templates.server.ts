// Whitelist-based template renderer. No eval(), no Liquid, no arbitrary
// executable expressions — only `{variable}` tokens drawn from an explicit
// allowlist are substituted. Unknown tokens are left as literal text so a
// malformed template never throws at send time.
import { ALLOWED_TEMPLATE_VARIABLES } from "~/lib/template-variables";

export interface TemplateVariables {
  order_number: string;
  order_status: string;
  order_total: string;
  currency: string;
  shop_name: string;
}

// {first_name} and any other protected-customer-data variable are
// intentionally NOT in this v1 allowlist — see PRIVACY-DATA-FLOW.md.
const ALLOWED_KEYS = new Set<keyof TemplateVariables>(ALLOWED_TEMPLATE_VARIABLES);

export function renderTemplate(
  template: string,
  variables: TemplateVariables,
): string {
  return template.replace(/\{([a-zA-Z_]+)\}/g, (match, key: string) => {
    if (ALLOWED_KEYS.has(key as keyof TemplateVariables)) {
      return variables[key as keyof TemplateVariables];
    }
    return match;
  });
}

export function extractTemplateVariables(template: string): string[] {
  const matches = template.matchAll(/\{([a-zA-Z_]+)\}/g);
  return Array.from(matches, (m) => m[1] as string);
}

export function validateTemplate(template: string): {
  valid: boolean;
  unknownVariables: string[];
} {
  const unknownVariables = extractTemplateVariables(template).filter(
    (key) => !ALLOWED_KEYS.has(key as keyof TemplateVariables),
  );
  return { valid: unknownVariables.length === 0, unknownVariables };
}

export const DEFAULT_TEMPLATE_BODY =
  "Your order {order_number} from {shop_name} is now {order_status}.";
