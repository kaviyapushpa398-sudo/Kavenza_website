export type ProcessStage = {
  index: string;
  title: string;
  description: string;
};

export const processStages: ProcessStage[] = [
  {
    index: "01",
    title: "Idea",
    description: "Every product begins with a problem worth solving.",
  },
  {
    index: "02",
    title: "Understand",
    description: "We study the users, context, requirements, and constraints.",
  },
  {
    index: "03",
    title: "Design",
    description: "We shape the experience before we shape the technology.",
  },
  {
    index: "04",
    title: "Build",
    description: "We transform validated ideas into reliable software.",
  },
  {
    index: "05",
    title: "Intelligence",
    description: "We apply data and AI where they create genuine value.",
  },
  {
    index: "06",
    title: "Launch",
    description: "We turn the product into something people can actually use.",
  },
  {
    index: "07",
    title: "Evolve",
    description: "We learn from real usage and continuously improve.",
  },
];
