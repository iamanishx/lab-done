export type InputMode = "markdown" | "latex" | "python";
export type PaperPreset = "a4" | "letter" | "custom";
export type Handwriting = "mynerve" | "handlee" | "reenie" | "edu" | "gloria" | "patrick" | "kalam" | "caveat" | "custom";
export interface Settings {
  paper: PaperPreset;
  width: number;
  height: number;
  margin: number;
  font: Handwriting;
  fontSize: number;
  lineHeight: number;
  ink: string;
  ruled: boolean;
  guideMargin: boolean;
  variation: boolean;
  pageNumbers: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  paper: "a4", width: 210, height: 297, margin: 20,
  font: "mynerve", fontSize: 20, lineHeight: 1.6,
  ink: "#234c9b", ruled: false, guideMargin: false,
  variation: true, pageNumbers: true,
};
export const FONT_FAMILIES: Record<Handwriting, string> = {
  mynerve: "Mynerve", handlee: "Handlee", reenie: "Reenie Beanie", edu: "Edu NSW ACT Foundation", gloria: "Gloria Hallelujah",
  patrick: "Patrick Hand", kalam: "Kalam", caveat: "Caveat", custom: "My Handwriting",
};
export const FONT_OPTIONS = [
  ["mynerve", "Natural notes", "Mynerve"],
  ["handlee", "Neat everyday pen", "Handlee"],
  ["edu", "Sloped lab writing", "Edu NSW ACT Foundation"],
  ["reenie", "Loose ballpoint", "Reenie Beanie"],
  ["gloria", "Round student hand", "Gloria Hallelujah"],
  ["patrick", "Everyday", "Patrick Hand"],
  ["kalam", "A little slanted", "Kalam"],
  ["caveat", "Loose notes", "Caveat"],
] as const;
export const MAX_SOURCE_LENGTH = 150_000;
