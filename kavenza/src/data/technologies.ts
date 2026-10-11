export type Technology = {
  name: string;
  description: string;
};

/**
 * Framed as capability areas KAVENZA builds with — not a claim that every
 * item is running in a specific client's production stack today.
 */
export const technologies: Technology[] = [
  {
    name: "Python",
    description:
      "Used for AI/ML systems, data processing, intelligent applications, and backend development.",
  },
  {
    name: "React",
    description: "Used to build responsive and interactive digital experiences.",
  },
  {
    name: "TypeScript",
    description: "Used to build safer, more maintainable software at scale.",
  },
  {
    name: "FastAPI",
    description: "Used for modern, high-performance backend APIs.",
  },
  {
    name: "PostgreSQL",
    description: "Used for structured, reliable application data.",
  },
  {
    name: "AI / ML",
    description:
      "Used where intelligent prediction, recommendation, and automation create meaningful value.",
  },
  {
    name: "APIs",
    description: "Used to connect systems and enable integrations across platforms.",
  },
  {
    name: "Cloud",
    description: "Used to deploy, scale, and run applications reliably.",
  },
];
