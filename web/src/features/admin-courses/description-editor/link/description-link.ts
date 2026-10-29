const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);
const MAX_LINK_LENGTH = 2048;

export const LINK_ADDRESS_MESSAGE =
  "Start the address with https://, http://, mailto: or tel:";

/**
 * Whether the API accepts this link address in a description: a full address
 * with one of four schemes, at most 2,048 characters. Tiptap's own check also
 * allows ftp:, sms: and addresses with no scheme, which the API refuses.
 */
export function isAllowedDescriptionLink(href: string) {
  if (href.length > MAX_LINK_LENGTH || !URL.canParse(href)) {
    return false;
  }
  return ALLOWED_PROTOCOLS.has(new URL(href).protocol);
}
