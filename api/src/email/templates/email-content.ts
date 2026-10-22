/**
 * What an email says, independent of how it looks. Each kind builds one of
 * these, and the HTML and plain-text renderers turn it into the two parts of
 * the message, so a wording change is made once.
 */
export type EmailContent = {
  subject: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};
