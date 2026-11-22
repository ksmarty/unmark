/**
 * Demo mode: a small set of bundled before/after pairs so the whole app —
 * queue, compare slider, downloads, settings — can be explored without an
 * OpenRouter key. Nothing is generated at runtime; the "cleaned" files ship
 * with the app.
 */

export function demoAsset(file: string): string {
  return `${import.meta.env.BASE_URL}demo/${file}`;
}

export interface DemoScene {
  name: string;
  before: string;
  after: string;
  width: number;
  height: number;
  ratio: string;
  resolution: string;
  cost: number;
}

export const DEMO_SCENES: DemoScene[] = [
  {
    name: "coastline-golden-hour.jpg",
    before: "coast.jpg",
    after: "coast-clean.jpg",
    width: 1600,
    height: 1067,
    ratio: "3:2",
    resolution: "2K",
    cost: 0.0039,
  },
  {
    name: "studio-portrait.jpg",
    before: "portrait.jpg",
    after: "portrait-clean.jpg",
    width: 1200,
    height: 1500,
    ratio: "4:5",
    resolution: "2K",
    cost: 0.0045,
  },
];

export const DEMO_REFERENCE = {
  name: "reference-portrait.jpg",
  file: "reference.jpg",
  width: 600,
  height: 600,
};

export const DEMO_MODEL = "demo/sample-results";
