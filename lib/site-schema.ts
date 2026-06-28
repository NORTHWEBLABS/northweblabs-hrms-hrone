import type { Block } from "@/components/site/SiteHome";
import { DEFAULT_SECTIONS } from "@/lib/site-defaults";

/* ============================================================
   Editor schema. For each section type we describe which
   fields are editable and how to render an input for each.
   The editor walks these to build the per-section forms.
   ============================================================ */

export type Field =
  | { k: "text"; path: string; label: string; group?: string; placeholder?: string }
  | { k: "area"; path: string; label: string; group?: string; placeholder?: string }
  | { k: "select"; path: string; label: string; options: string[]; group?: string }
  | { k: "bool"; path: string; label: string; group?: string }
  | { k: "int"; path: string; label: string; group?: string }
  | { k: "strings"; path: string; label: string; group?: string }
  | { k: "numbers"; path: string; label: string; group?: string }
  | { k: "repeat"; path: string; label: string; itemLabel: string; fields: Field[]; group?: string };

const ctaFields: Field[] = [
  { k: "text", path: "label", label: "Label" },
  { k: "text", path: "href", label: "Link" },
  { k: "select", path: "style", label: "Style", options: ["primary", "outline", "dark", "white", "ghost", "watch"] },
];

export const BLOCK_TYPES: Record<string, { label: string; icon: string; fields: Field[]; make: () => any }> = {
  hero: {
    label: "Hero", icon: "Sparkles",
    make: () => seedOf("hero"),
    fields: [
      { k: "text", path: "desktop.pill", label: "Pill text", group: "Desktop hero" },
      { k: "area", path: "desktop.headline", label: "Headline (Enter = line break)", group: "Desktop hero" },
      { k: "text", path: "desktop.accent", label: "Accent line (colored)", group: "Desktop hero" },
      { k: "area", path: "desktop.sub", label: "Subtext", group: "Desktop hero" },
      { k: "repeat", path: "desktop.ctas", label: "Buttons", itemLabel: "Button", fields: ctaFields, group: "Desktop hero" },

      { k: "text", path: "people.title", label: "Card title", group: "People card" },
      { k: "text", path: "people.period", label: "Period", group: "People card" },
      { k: "repeat", path: "people.stats", label: "Stats", itemLabel: "Stat", group: "People card", fields: [
        { k: "text", path: "label", label: "Label" },
        { k: "text", path: "num", label: "Number" },
        { k: "text", path: "sub", label: "Sub" },
        { k: "bool", path: "up", label: "Show as positive (bold)" },
      ]},
      { k: "repeat", path: "people.chart", label: "Chart bars", itemLabel: "Bar", group: "People card", fields: [
        { k: "text", path: "m", label: "Label" },
        { k: "int", path: "h", label: "Height (px)" },
      ]},

      { k: "text", path: "mobile.pill", label: "Pill text", group: "Mobile hero" },
      { k: "area", path: "mobile.headline", label: "Headline", group: "Mobile hero" },
      { k: "text", path: "mobile.accent", label: "Accent line", group: "Mobile hero" },
      { k: "area", path: "mobile.sub", label: "Subtext", group: "Mobile hero" },
      { k: "repeat", path: "mobile.ctas", label: "Buttons", itemLabel: "Button", fields: ctaFields, group: "Mobile hero" },
    ],
  },

  moduleStrip: {
    label: "Module strip", icon: "LayoutGrid",
    make: () => seedOf("moduleStrip"),
    fields: [
      { k: "text", path: "label", label: "Strip label" },
      { k: "strings", path: "items", label: "Modules" },
    ],
  },

  platform: {
    label: "Platform / features", icon: "Grid3x3",
    make: () => seedOf("platform"),
    fields: [
      { k: "text", path: "kicker", label: "Kicker" },
      { k: "area", path: "heading", label: "Heading" },
      { k: "area", path: "sub", label: "Subtext" },
      { k: "repeat", path: "cards", label: "Feature cards", itemLabel: "Card", fields: [
        { k: "select", path: "variant", label: "Variant", options: ["dark", "light"] },
        { k: "text", path: "icon", label: "Icon (people / clock / calendar / wallet / approvals)" },
        { k: "text", path: "title", label: "Title" },
        { k: "area", path: "text", label: "Text" },
        { k: "text", path: "href", label: "Link" },
        { k: "text", path: "tile", label: "Tile colour (blue-tile / green-tile / amber-tile / indigo-tile)" },
      ]},
    ],
  },

  speed: {
    label: "Built for speed", icon: "Gauge",
    make: () => seedOf("speed"),
    fields: [
      { k: "text", path: "kicker", label: "Kicker" },
      { k: "area", path: "heading", label: "Heading (Enter = line break)" },
      { k: "repeat", path: "items", label: "Bullets", itemLabel: "Bullet", fields: [
        { k: "text", path: "title", label: "Title" },
        { k: "area", path: "text", label: "Text" },
      ]},
      { k: "text", path: "cta.label", label: "CTA label", group: "CTA button" },
      { k: "text", path: "cta.href", label: "CTA link", group: "CTA button" },
      { k: "text", path: "mock.greeting", label: "Greeting", group: "Dashboard mock" },
      { k: "text", path: "mock.payLabel", label: "Pay label", group: "Dashboard mock" },
      { k: "text", path: "mock.payAmount", label: "Pay amount", group: "Dashboard mock" },
      { k: "text", path: "mock.daysNum", label: "Days number", group: "Dashboard mock" },
      { k: "text", path: "mock.statusText", label: "Status text", group: "Dashboard mock" },
      { k: "text", path: "mock.timeRange", label: "Time range", group: "Dashboard mock" },
      { k: "text", path: "mock.chip1", label: "Chip 1", group: "Dashboard mock" },
      { k: "text", path: "mock.chip2Title", label: "Chip 2 title", group: "Dashboard mock" },
      { k: "text", path: "mock.chip2Sub", label: "Chip 2 sub", group: "Dashboard mock" },
      { k: "numbers", path: "mock.bars", label: "Bar heights", group: "Dashboard mock" },
      { k: "numbers", path: "mock.pips", label: "Pips (1 = filled, 0 = empty)", group: "Dashboard mock" },
    ],
  },

  stats: {
    label: "Stats band", icon: "BarChart3",
    make: () => seedOf("stats"),
    fields: [
      { k: "repeat", path: "items", label: "Stats", itemLabel: "Stat", fields: [
        { k: "text", path: "num", label: "Number" },
        { k: "text", path: "label", label: "Label" },
      ]},
    ],
  },

  ctaBanner: {
    label: "CTA banner", icon: "Megaphone",
    make: () => seedOf("ctaBanner"),
    fields: [
      { k: "text", path: "heading", label: "Heading" },
      { k: "area", path: "text", label: "Text" },
      { k: "repeat", path: "ctas", label: "Buttons", itemLabel: "Button", fields: ctaFields },
    ],
  },
};

export const SECTION_LIBRARY = Object.entries(BLOCK_TYPES).map(([type, v]) => ({ type, label: v.label, icon: v.icon }));

function seedOf(type: string): any {
  const b = DEFAULT_SECTIONS.find((s) => s.type === type);
  return b ? JSON.parse(JSON.stringify(b.data)) : {};
}

export function newBlock(type: string): Block {
  const def = BLOCK_TYPES[type];
  return { id: `${type}-${Date.now().toString(36)}`, type, enabled: true, data: def ? def.make() : {} };
}

export function blockLabel(type: string): string {
  return BLOCK_TYPES[type]?.label || type;
}