import { Face } from "@/components/Face";

export const metadata = { title: "Back soon", robots: { index: false, follow: false } };

export default function MaintenancePage() {
  return <main className="flex min-h-svh flex-col items-center justify-center px-5 py-12 text-center">
    <div className="flex flex-col items-center gap-3"><span className="text-7xl"><Face /></span><p className="text-xl font-extrabold tracking-tight sm:text-2xl">Nauseated Face</p></div>
    <div className="my-10" aria-hidden="true"><span className="rotten-egg-scene"><span className="egg-stink egg-stink-one" /><span className="egg-stink egg-stink-two" /><span className="rotten-egg"><span className="egg-crack" /><span className="egg-eyes">× ×</span><span className="egg-mouth" /></span></span></div>
    <h1 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-5xl">We&apos;re freshening things up.</h1>
    <p className="mt-5 max-w-md text-base leading-7 text-muted sm:text-lg">Nauseated Face will be back soon. Thanks for hanging in there.</p>
  </main>;
}
