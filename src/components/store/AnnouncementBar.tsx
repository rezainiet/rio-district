import Link from "next/link";
import { getT } from "@/i18n/server";

/** The actual offer, kept readable on small screens. */
export async function AnnouncementBar({ text }: { text: string }) {
  const { href } = await getT();
  return <div className="offer-announcement" data-announcement><Link href={href("/#pack")}><span aria-hidden="true">✦</span><span>{text}</span><span aria-hidden="true">↗</span></Link></div>;
}
