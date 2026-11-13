export type ThemeGroup = "default" | "combination" | "colorful" | "new";

export type ThemeOption = {
  id: string;
  label: string;
  description: string;
  group: ThemeGroup;
  swatches: [string, string, string];
};

export const DEFAULT_THEME_ID = "clean";
export const THEME_STORAGE_KEY = "fwf-theme";

export const THEME_GROUPS: { id: ThemeGroup; label: string }[] = [
  { id: "default", label: "ธีมเริ่มต้น" },
  { id: "combination", label: "Combination themes" },
  { id: "colorful", label: "Colorful themes" },
  { id: "new", label: "New themes" },
];

export const THEMES: ThemeOption[] = [
  {
    id: DEFAULT_THEME_ID,
    label: "Clean · ขาวสะอาด",
    description: "พื้นขาว สเลตกลาง — ธีมหลักของหน้ารวม",
    group: "default",
    swatches: ["#334155", "#64748b", "#f1f5f9"],
  },
  {
    id: "grass",
    label: "Grass · ฟ้า-เขียว",
    description: "ธีมเดิมของ FWF Task Manager",
    group: "default",
    swatches: ["#6bb82a", "#5bb5e8", "#d6e8f5"],
  },
  {
    id: "cerulean",
    label: "Cerulean · ฟ้าเซรูเลียน",
    description: "ปุ่มฟ้าสดอมเขียว เทาเย็นแบบน้ำแข็ง",
    group: "new",
    swatches: ["#0061a2", "#137ece", "#d7ebff"],
  },
  {
    id: "pine",
    label: "Pine · ร่มสน",
    description: "ปุ่มสนเข้มทั้งชุด พื้นเซจหม่น",
    group: "new",
    swatches: ["#295142", "#1c8f6e", "#acfddd"],
  },
  {
    id: "rose",
    label: "Rose · ชมพูสัญญาณ",
    description: "ปุ่มชมพูชัด เทาอมชมพู",
    group: "new",
    swatches: ["#972670", "#b6508d", "#ffdeef"],
  },
  {
    id: "apple",
    label: "Apple · เขียวใบ",
    description: "ปุ่มเขียวใบสด เทาครีมใบ",
    group: "new",
    swatches: ["#4c6900", "#678724", "#d9f4b2"],
  },
  {
    id: "persimmon",
    label: "Persimmon · ลูกพลับ",
    description: "ปุ่มหมึกเย็น ลิงก์สีลูกพลับ เทาหินฟ้า",
    group: "new",
    swatches: ["#a93e11", "#cb6738", "#ffe1d7"],
  },
  {
    id: "citron",
    label: "Citron · เขียวมะนาว",
    description: "ปุ่มหมึก ลิงก์เขียวมะนาว เทาครีมเหลือง",
    group: "new",
    swatches: ["#5c6900", "#748400", "#e9efa9"],
  },
  {
    id: "cobalt",
    label: "Cobalt · โคบอลต์",
    description: "ปุ่มหมึกอุ่น ลิงก์โคบอลต์ พื้นทราย",
    group: "new",
    swatches: ["#1662b5", "#1f7dcf", "#d8ebff"],
  },
  {
    id: "dusk",
    label: "Dusk · ม่วงสนธยา",
    description: "ปุ่มหมึกเย็น ลิงก์ไลแลค พื้นเทาเย็น",
    group: "new",
    swatches: ["#7f44a0", "#9a5db1", "#f4e0ff"],
  },
  {
    id: "sakura",
    label: "Sakura · ซากุระกลางคืน",
    description: "ปุ่มเกือบดำ ลิงก์ซากุระ พื้นเทาอุ่น",
    group: "new",
    swatches: ["#a63866", "#c25485", "#ffdfe6"],
  },
  {
    id: "iris",
    label: "Iris · ม่วงไอริส",
    description: "ปุ่มม่วงน้ำเงิน เทาอมม่วงฟ้า",
    group: "new",
    swatches: ["#5349b8", "#6e6ad5", "#e4e6ff"],
  },
  {
    id: "papaya",
    label: "Papaya · ส้มมะละกอ",
    description: "ปุ่มส้มมะละกอ กรอบเขียวน้ำทะเล พื้นพีช",
    group: "colorful",
    swatches: ["#983e00", "#006660", "#ffded2"],
  },
  {
    id: "dragonfruit",
    label: "Dragonfruit · แก้วมังกร",
    description: "ปุ่มชมพูแก้วมังกร กรอบเขียวมะนาว พื้นชมพู",
    group: "colorful",
    swatches: ["#91307f", "#586d00", "#ffd9f3"],
  },
  {
    id: "azure",
    label: "Azure · ฟ้าปะการัง",
    description: "ปุ่มฟ้าสด กรอบปะการัง พื้นฟ้า",
    group: "colorful",
    swatches: ["#0061a2", "#af3d34", "#cfebff"],
  },
  {
    id: "grape",
    label: "Grape · องุ่น",
    description: "ปุ่มม่วงองุ่น กรอบทอง พื้นม่วงอ่อน",
    group: "colorful",
    swatches: ["#8d389e", "#8b6000", "#eddfff"],
  },
  {
    id: "mango",
    label: "Mango · มะม่วง",
    description: "ปุ่มมะม่วงสุก กรอบน้ำเงิน พื้นครีมส้ม",
    group: "colorful",
    swatches: ["#894d00", "#0056aa", "#ffe1bf"],
  },
  {
    id: "watermelon",
    label: "Watermelon · แตงโม",
    description: "ปุ่มเขียวเปลือกแตงโม กรอบชมพูเนื้อ พื้นมิ้นต์",
    group: "colorful",
    swatches: ["#006940", "#a13567", "#a3fdcd"],
  },
  {
    id: "hibiscus",
    label: "Hibiscus · ชบา",
    description: "ปุ่มชบา กรอบเขียวใบ พื้นชมพูร้อน",
    group: "colorful",
    swatches: ["#9c2047", "#186a23", "#ffdce2"],
  },
  {
    id: "lagoon",
    label: "Lagoon · ทะเลสาบ",
    description: "ปุ่มเขียวทะเล กรอบส้ม พื้นน้ำทะเล",
    group: "colorful",
    swatches: ["#006e5e", "#9f4500", "#8cffe9"],
  },
  {
    id: "indigo",
    label: "Indigo · ครามส้ม",
    description: "ปุ่มครามจัด กรอบส้มสด พื้นม่วงฟ้า",
    group: "colorful",
    swatches: ["#4249af", "#974c00", "#dfe6ff"],
  },
  {
    id: "cherry",
    label: "Cherry · เชอร์รี่",
    description: "ปุ่มเชอร์รี่ กรอบมิ้นต์ พื้นกุหลาบ",
    group: "colorful",
    swatches: ["#9a2737", "#008f53", "#ffdcdf"],
  },
  {
    id: "signal",
    label: "Signal · แดงดำ",
    description: "ชุดผสม 01",
    group: "combination",
    swatches: ["#ce0001", "#fd0100", "#ffe0db"],
  },
  {
    id: "crimson",
    label: "Crimson · แดงชาด",
    description: "ชุดผสม 02",
    group: "combination",
    swatches: ["#cd0132", "#dc123a", "#ffdfdf"],
  },
  {
    id: "serenity",
    label: "Serenity · ฟ้าบลัช",
    description: "ชุดผสม 03",
    group: "combination",
    swatches: ["#485c7f", "#956a6a", "#f7cac9"],
  },
  {
    id: "teal",
    label: "Teal · เขียวทอง",
    description: "ชุดผสม 04",
    group: "combination",
    swatches: ["#015d5c", "#8b6800", "#ffbf00"],
  },
  {
    id: "coral",
    label: "Coral · ปะการังหิน",
    description: "ชุดผสม 05",
    group: "combination",
    swatches: ["#af231b", "#2e485a", "#f7cac7"],
  },
  {
    id: "navy",
    label: "Navy · กรมท่าทอง",
    description: "ชุดผสม 06",
    group: "combination",
    swatches: ["#1f395f", "#1f3960", "#ffc002"],
  },
  {
    id: "sea",
    label: "Sea · เขียวครีม",
    description: "ชุดผสม 07",
    group: "combination",
    swatches: ["#117945", "#2e8a56", "#b7fbcc"],
  },
  {
    id: "iris-gold",
    label: "Iris · ม่วงทอง",
    description: "ชุดผสม 08",
    group: "combination",
    swatches: ["#5b49bd", "#6a5acc", "#fdd268"],
  },
  {
    id: "coral-ink",
    label: "Coral Ink · ส้มหมึก",
    description: "ชุดผสม 09",
    group: "combination",
    swatches: ["#b63e00", "#264654", "#fee0d3"],
  },
  {
    id: "steel",
    label: "Steel · น้ำเงินกากี",
    description: "ชุดผสม 10",
    group: "combination",
    swatches: ["#2c689c", "#4682b2", "#f0e58e"],
  },
  {
    id: "orchid",
    label: "Orchid · ม่วงชมพู",
    description: "ชุดผสม 11",
    group: "combination",
    swatches: ["#80007e", "#81017e", "#feb6c2"],
  },
  {
    id: "lagoon-sand",
    label: "Lagoon · ทะเลทราย",
    description: "ชุดผสม 12",
    group: "combination",
    swatches: ["#015b65", "#254653", "#e7c369"],
  },
  {
    id: "mint",
    label: "Mint · แดงมิ้นต์",
    description: "ชุดผสม 13",
    group: "combination",
    swatches: ["#c91330", "#e73946", "#ffe0dc"],
  },
  {
    id: "clay",
    label: "Clay · ดินเผา",
    description: "ชุดผสม 14",
    group: "combination",
    swatches: ["#452001", "#254653", "#ea6d50"],
  },
  {
    id: "oasis",
    label: "Oasis · โอเอซิส",
    description: "ชุดผสม 15",
    group: "combination",
    swatches: ["#005e56", "#294557", "#e9c569"],
  },
  {
    id: "ember",
    label: "Ember · ถ่านไฟ",
    description: "ชุดผสม 16",
    group: "combination",
    swatches: ["#740008", "#7e3f02", "#f78003"],
  },
  {
    id: "electric",
    label: "Electric · นีออน",
    description: "ชุดผสม 17",
    group: "combination",
    swatches: ["#001640", "#73022f", "#fe0170"],
  },
  {
    id: "grove",
    label: "Grove · สวนมะกอก",
    description: "ชุดผสม 18",
    group: "combination",
    swatches: ["#616d37", "#626c38", "#e0f0b0"],
  },
  {
    id: "glacier",
    label: "Glacier · น้ำแข็งกรมท่า",
    description: "ชุดผสม 19",
    group: "combination",
    swatches: ["#010b0c", "#00344f", "#4b80a4"],
  },
  {
    id: "petal",
    label: "Petal · กลีบดอก",
    description: "ชุดผสม 20",
    group: "combination",
    swatches: ["#6c5577", "#986a7c", "#ffc8dd"],
  },
];

const THEME_IDS = new Set(THEMES.map((theme) => theme.id));

export function isThemeId(value: unknown): value is string {
  return typeof value === "string" && THEME_IDS.has(value);
}

/** Clears legacy browser-stored themes so aggregate pages always start clean white. */
export const THEME_INIT_SCRIPT = `try{document.documentElement.removeAttribute("data-theme");localStorage.removeItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}`;

/** Apply a theme for the current visit (project pages). Does not persist to localStorage. */
export function applyTheme(id: string) {
  const root = document.documentElement;
  const next = isThemeId(id) ? id : DEFAULT_THEME_ID;
  if (next === DEFAULT_THEME_ID) delete root.dataset.theme;
  else root.dataset.theme = next;
}

export function readTheme(): string {
  if (typeof document === "undefined") return DEFAULT_THEME_ID;
  const current = document.documentElement.dataset.theme;
  return isThemeId(current) ? current : DEFAULT_THEME_ID;
}

export function resolveProjectTheme(theme: string | null | undefined): string {
  return isThemeId(theme) ? theme : DEFAULT_THEME_ID;
}

/** Primary accent from a theme — used as the project badge/dot color. */
export function themeAccentColor(theme: string | null | undefined): string {
  const id = resolveProjectTheme(theme);
  const option = THEMES.find((item) => item.id === id) ?? THEMES[0];
  return option.swatches[0];
}
