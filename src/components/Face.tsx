import Image from "next/image";

// One desktop-rendered asset keeps the brand identical on every operating system.
export function Face() {
  return <Image src="/nauseated-face.png" width={512} height={512} alt="" aria-hidden="true" className="face-art" loading="eager" unoptimized />;
}
