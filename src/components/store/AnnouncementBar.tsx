import Link from "next/link";
/** The actual offer, kept readable on small screens. */
export function AnnouncementBar({ text }: { text: string }) {
  return <div className="offer-announcement" data-announcement><Link href="/#pack"><span aria-hidden="true">✦</span><span>{text}</span><span aria-hidden="true">↗</span></Link></div>;
}
