/* Minimal Liquid-ish engine for custom homepage sections (Shopify-style).
   Supports a {% schema %}…{% endschema %} JSON block, {{ settings.key }}
   variable output, and simple {% if settings.key %}…{% else %}…{% endif %}. */

export type Setting = {
  type: string;            // text | textarea | richtext | url | number | checkbox | color | select
  id: string;
  label?: string;
  default?: any;
  info?: string;
  options?: { value: string; label: string }[];
};
export type Schema = { name?: string; settings: Setting[] };

const SCHEMA_RE = /\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/;

export function parseTemplate(src: string): { body: string; schema: Schema | null; error?: string } {
  const m = src.match(SCHEMA_RE);
  let schema: Schema | null = null;
  let error: string | undefined;
  if (m) {
    try {
      const parsed = JSON.parse(m[1]);
      schema = { name: parsed.name, settings: Array.isArray(parsed.settings) ? parsed.settings : [] };
    } catch (e: any) {
      error = "Schema JSON error: " + (e?.message || "invalid JSON");
    }
  }
  const body = src.replace(SCHEMA_RE, "").trim();
  return { body, schema, error };
}

export function defaultsOf(schema: Schema | null): Record<string, any> {
  const o: Record<string, any> = {};
  (schema?.settings || []).forEach((s) => { o[s.id] = s.default ?? (s.type === "checkbox" ? false : ""); });
  return o;
}

export function renderLiquid(body: string, values: Record<string, any>): string {
  let out = body;
  // simple if/else (non-nested), based on settings truthiness
  let prev = "", guard = 0;
  do {
    prev = out;
    out = out.replace(
      /\{%\s*if\s+(?:section\.)?settings\.([\w-]+)\s*%\}([\s\S]*?)(?:\{%\s*else\s*%\}([\s\S]*?))?\{%\s*endif\s*%\}/g,
      (_m, key, a, b) => {
        const v = values[key];
        const truthy = !!v && v !== "false" && v !== 0 && v !== "0";
        return truthy ? a : (b || "");
      }
    );
  } while (out !== prev && guard++ < 25);
  // variable output
  out = out.replace(/\{\{\s*(?:section\.)?settings\.([\w-]+)\s*\}\}/g, (_m, k) => (values[k] != null ? String(values[k]) : ""));
  out = out.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_m, k) => (values[k] != null ? String(values[k]) : ""));
  return out;
}

// Convenience: render a full custom-section template with override settings.
export function renderSection(template: string, overrides: Record<string, any> = {}): string {
  const { body, schema } = parseTemplate(template || "");
  const values = { ...defaultsOf(schema), ...overrides };
  return renderLiquid(body, values);
}

export const DEFAULT_SECTION_TEMPLATE = `<section style="padding:72px 24px;text-align:center;max-width:760px;margin:0 auto">
  <p style="text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:700;color:#4f46e5">{{ settings.kicker }}</p>
  <h2 style="font-size:34px;font-weight:800;margin:8px 0 12px;color:#0b1220">{{ settings.heading }}</h2>
  <p style="color:#64748b;font-size:17px;line-height:1.6">{{ settings.subtext }}</p>
  {% if settings.show_button %}
  <a href="{{ settings.button_link }}" style="display:inline-block;margin-top:22px;background:#4f46e5;color:#fff;padding:12px 22px;border-radius:12px;font-weight:700;text-decoration:none">{{ settings.button_label }}</a>
  {% endif %}
</section>

{% schema %}
{
  "name": "Custom section",
  "settings": [
    { "type": "text",     "id": "kicker",        "label": "Kicker",       "default": "New" },
    { "type": "text",     "id": "heading",       "label": "Heading",      "default": "A custom section" },
    { "type": "textarea", "id": "subtext",       "label": "Subtext",      "default": "Write Liquid + HTML here. These fields come from the schema below." },
    { "type": "checkbox", "id": "show_button",   "label": "Show button",  "default": true },
    { "type": "text",     "id": "button_label",  "label": "Button label", "default": "Get started" },
    { "type": "url",      "id": "button_link",   "label": "Button link",  "default": "/signup" }
  ]
}
{% endschema %}`;
