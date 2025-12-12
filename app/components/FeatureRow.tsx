
import Image from "next/image";

type Props = {
  title: string;
  desc: string;
  bullet: string[];
  imageSrc?: string;
  reverse?: boolean;
};

export default function FeatureRow({
  title,
  desc,
  bullet,
  imageSrc,
  reverse,
}: Props) {
  return (
    <section className="py-10">
      <div
        className={`mx-auto max-w-6xl px-6 grid gap-10 items-center md:grid-cols-2 ${
          reverse ? "md:[&>*:first-child]:order-2" : ""
        }`}
      >
        {/* Image card */}
        <div className="glass p-3 rounded-2xl">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={`${title} preview`}
              width={1200}
              height={800}
              className="w-full h-auto rounded-xl object-cover"
            />
          ) : (
            <div className="h-56 rounded-xl bg-black/20" />
          )}
        </div>

        {/* Text */}
        <div>
          <h3 className="text-xl font-semibold text-zinc-100">{title}</h3>
          <p className="text-zinc-300/90 mt-2">{desc}</p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300/90 list-disc list-inside">
            {bullet.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
