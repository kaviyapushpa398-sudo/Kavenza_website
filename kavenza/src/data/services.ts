export type Service = {
  index: string;
  title: string;
  description: string;
  examples: string[];
};

export const services: Service[] = [
  {
    index: "01",
    title: "AI & Machine Learning",
    description: "Intelligent systems that predict, recommend, analyze, and automate.",
    examples: [
      "Recommendation systems",
      "Prediction models",
      "AI-powered platforms",
      "Intelligent automation",
    ],
  },
  {
    index: "02",
    title: "Software Products",
    description: "Full-stack applications designed around real user needs.",
    examples: ["Web applications", "SaaS platforms", "APIs", "Management systems"],
  },
  {
    index: "03",
    title: "Digital Experiences",
    description: "Clean, intuitive interfaces where technology meets thoughtful design.",
    examples: [
      "Web experiences",
      "Interactive dashboards",
      "User interfaces",
      "Product experiences",
    ],
  },
  {
    index: "04",
    title: "Custom Solutions",
    description: "Technology designed around specific organizational and business problems.",
    examples: ["Educational institutions", "Startups", "Small businesses", "Organizations"],
  },
];
