type Img = { kind?: string } | null | undefined;

/**
 * The generated illustrations sit small inside their frame and need a zoom to
 * fill a tile; photographs are already framed and must not be cropped further.
 */
export function artClass(img: Img, use: "hero" | "card" | "thumb" | "pack") {
  const placeholder = img?.kind === "placeholder";
  switch (use) {
    case "hero":
      return placeholder ? "scale-[1.12] group-hover:scale-[1.18]" : "group-hover:scale-[1.04]";
    case "card":
      return placeholder ? "scale-[1.06] group-hover:scale-[1.1]" : "group-hover:scale-[1.04]";
    case "thumb":
      return placeholder ? "scale-[1.15]" : "";
    case "pack":
      return placeholder ? "scale-[1.08]" : "";
  }
}
