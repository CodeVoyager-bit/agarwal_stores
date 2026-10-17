import { Fragment, type ReactNode } from "react";

/**
 * Words with a link or bold part inside, where each language puts it in its own place:
 * rich("Agree to the <terms>Terms</terms>.", { terms: (s) => <Link href="/terms">{s}</Link> }).
 */
export function rich(text: string, tags: Record<string, (inner: string) => ReactNode>): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const tag of text.matchAll(/<(\w+)>(.*?)<\/\1>/g)) {
    out.push(text.slice(last, tag.index));
    out.push(<Fragment key={tag.index}>{tags[tag[1]]?.(tag[2]) ?? tag[2]}</Fragment>);
    last = tag.index + tag[0].length;
  }
  out.push(text.slice(last));
  return out;
}
