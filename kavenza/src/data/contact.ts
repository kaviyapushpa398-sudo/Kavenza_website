export const projectTypes = [
  "AI Product",
  "Web Application",
  "Business Solution",
  "Partnership",
  "Something Else",
] as const;

export type ProjectType = (typeof projectTypes)[number];
