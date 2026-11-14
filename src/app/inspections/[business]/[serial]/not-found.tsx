import Link from "next/link";
export default function NotFound() {
  return <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6"><h1 className="text-3xl font-extrabold">Inspection not found</h1><p className="my-5 text-muted">This exact inspection is not available in the current source. Check the link or return to the latest records.</p><Link href="/#latest" className="text-nausea underline">Back to inspections</Link></section>;
}
