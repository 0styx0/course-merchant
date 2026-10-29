import type { EmailKind } from "../outbox/email-outbox.repository.js";
import type { EmailContent, RenderedEmail } from "./email-content.js";
import {
  accessGranted,
  accessSuspended,
  alreadyOwned,
  disputeAlert,
  type EmailViews,
} from "./email-templates.js";
import { renderHtml } from "./render-html.js";
import { renderText } from "./render-text.js";

export type EmailToRender = {
  [Kind in EmailKind]: { kind: Kind; view: EmailViews[Kind] };
}[EmailKind];

function contentFor(email: EmailToRender): EmailContent {
  switch (email.kind) {
    case "access_granted":
      return accessGranted(email.view);
    case "already_owned":
      return alreadyOwned(email.view);
    case "access_suspended":
      return accessSuspended(email.view);
    case "dispute_alert":
      return disputeAlert(email.view);
  }
}

export function renderEmail(
  email: EmailToRender,
  shopName: string,
): RenderedEmail {
  const content = contentFor(email);

  return {
    subject: content.subject,
    text: renderText(content, shopName),
    html: renderHtml(content, shopName),
  };
}
