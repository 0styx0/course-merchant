import Image from "next/image";

type CourseImageProps = {
  src: string;
};

// A missing or failing image leaves the empty 16:9 box; nothing else moves.
export function CourseImage({ src }: CourseImageProps) {
  return (
    <Image
      src={src}
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
