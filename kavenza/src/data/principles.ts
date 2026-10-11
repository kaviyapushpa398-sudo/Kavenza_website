import { Layers, Lightbulb, TrendingUp, type LucideIcon } from "lucide-react";

export type Principle = {
  title: string;
  from: string;
  to: string;
  description: string;
  icon: LucideIcon;
};

export const principles: Principle[] = [
  {
    title: "Build",
    from: "Ideas",
    to: "Products",
    description:
      "We turn early concepts into working software — structured, tested, and built to ship.",
    icon: Layers,
  },
  {
    title: "Innovate",
    from: "Problems",
    to: "Possibilities",
    description:
      "We look past the obvious fix and design solutions that open up new ways of working.",
    icon: Lightbulb,
  },
  {
    title: "Evolve",
    from: "Products",
    to: "Progress",
    description:
      "We treat launch as a starting point — refining and adapting as real usage teaches us more.",
    icon: TrendingUp,
  },
];
