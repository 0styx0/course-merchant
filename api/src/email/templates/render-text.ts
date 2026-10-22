import type { EmailContent } from "./email-content.js";

export function renderText(content: EmailContent, shopName: string): string {
  const sections = [
    content.heading,
    ...content.paragraphs,
    ...(content.button
      ? [`${content.button.label}: ${content.button.url}`]
      : []),
    `— ${shopName}`,
  ];

  return sections.join("\n\n");
}
