"use client";

import { useEffect, useState } from "react";

/** A temporary address for showing the file; released when the file changes or the field goes. */
function useObjectUrl(file: File | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    // The address exists only in the browser, so it can't be made during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return file ? url : undefined;
}

/** The chosen file, shown 16:9 and cropped like the public pages. */
export function ImagePreview({ file }: { file: File }) {
  const url = useObjectUrl(file);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a local blob, not optimizable
    <img
      src={url}
      alt="Preview of the chosen image"
      className="aspect-video w-full rounded-lg border object-cover object-center"
    />
  );
}
