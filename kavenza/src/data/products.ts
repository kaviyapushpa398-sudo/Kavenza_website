import clipMindImage from "../assets/clipmind-ai.jpeg";
import smartAiCareerImage from "../assets/smart-ai-career.jpeg";

export type Product = {
  slug: string;
  number: string;
  name: string;
  category: string[];
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  demoUrl: string;
  /** Technology / capability areas the product draws on — not a claim of
   *  specific vendor tooling, just the domains involved. */
  tags: string[];
};

export const products: Product[] = [
  {
    slug: "smart-ai-career-recommendation-system",
    number: "01",
    name: "Smart AI Career Recommendation System",
    category: ["AI", "Career Intelligence", "Education"],
    title: "Career Intelligence",
    description:
      "AI-powered personalized career guidance that analyzes skills, interests, projects, and profiles to recommend suitable career paths and identify skill gaps.",
    image: smartAiCareerImage,
    imageAlt: "Smart AI Career Recommendation System interface",
    demoUrl:
      "https://drive.google.com/file/d/1w1cG8EWt4I8-65zDkDKsdmgcelyM0wlO/view?usp=drivesdk",
    tags: ["AI & Machine Learning", "Recommendation Systems", "Career Analytics", "Personalization"],
  },
  {
    slug: "clipmind-ai",
    number: "02",
    name: "ClipMind AI",
    category: ["AI", "Video Intelligence", "Education"],
    title: "Video Intelligence & Summarization",
    description:
      "AI-powered video summarization and key-moment detection platform that transforms long-form video content into concise, meaningful insights.",
    image: clipMindImage,
    imageAlt: "ClipMind AI video summarization interface",
    demoUrl:
      "https://drive.google.com/file/d/1v3-Kc0qTSWqvsFIE1tB8TSDNowoo_IRT/view?usp=drivesdk",
    tags: ["Natural Language Processing", "Video Intelligence", "Summarization", "Speech Recognition"],
  },
];
