import Image from "next/image";

// One desktop-rendered asset keeps the brand identical on every operating system.
export function Face() {
  return <Image src="/nauseated-face-artwork.png" width={1024} height={1024} sizes="(max-width: 600px) 128px, 256px" alt="" aria-hidden="true" className="face-art" loading="eager" />;
}
