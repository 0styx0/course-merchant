import Image from "next/image";

type CourseImageProps = {
  src: string;
  /**
   * Serves the file straight from `src`. Pages behind the admin login need
   * it: Next's resizer fetches the image without the browser's cookies, so
   * the admin image route would refuse it.
   */
  isUnoptimized?: boolean;
};

// A missing or failing image leaves the empty 16:9 box; nothing else moves.
export function CourseImage({ src, isUnoptimized }: CourseImageProps) {
  return (
    <Image
      src={src}
      unoptimized={isUnoptimized}
      width={1600}
      height={900}
      alt=""
      // the largest thing on screen, so the browser fetches it first
      preload
      // columns 1-7 of the 1200px frame (1104px inside its padding, 32px gaps) from md; full width on a phone
      sizes="(min-width: 768px) 631px, 100vw"
      className="aspect-video w-full"
    />
  );
}
