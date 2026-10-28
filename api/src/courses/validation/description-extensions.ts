import StarterKit from "@tiptap/starter-kit";

/**
 * The one editor configuration: only what the course description may contain.
 * Headings start at level 2 because the course name is the page's <h1>.
 */
export const descriptionExtensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    heading: { levels: [2, 3, 4] },
    link: {
      autolink: true,
      openOnClick: false,
      // Links open in the same tab: a new window is an unannounced context change
      HTMLAttributes: { target: null },
    },
  }),
];
