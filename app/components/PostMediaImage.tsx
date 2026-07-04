"use client";

import { useState } from "react";
import { getProxiedMediaUrl } from "@/lib/mediaUrl";

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

export default function PostMediaImage({ src, alt, className }: Props) {
  const [useProxy, setUseProxy] = useState(false);
  const displaySrc = useProxy ? getProxiedMediaUrl(src) : src;

  return (
    <img
      src={displaySrc}
      alt={alt || "Post media"}
      referrerPolicy="no-referrer"
      loading="lazy"
      className={className}
      onError={() => {
        if (!useProxy) setUseProxy(true);
      }}
    />
  );
}
