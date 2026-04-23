import Image from "next/image";
import Link from "next/link";
import { featuredCampaigns } from "@/lib/constants/home";

export function FeaturedCampaignsSection() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] py-16">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-4xl font-bold reveal-up">Featured Campaigns</h2>
          <Link
            href="/campaigns"
            className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
          >
            Show More
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featuredCampaigns.map((campaign, index) => (
            <article
              key={campaign.title}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] reveal-zoom lift-hover"
              style={{ animationDelay: `${index * 110}ms` }}
            >
              <Image
                src={campaign.imageUrl}
                alt={campaign.title}
                width={1200}
                height={800}
                className="h-40 w-full object-cover"
              />
              <div className="space-y-3 p-4">
                <h3 className="line-clamp-2 min-h-12 text-sm font-semibold">{campaign.title}</h3>
                <p className="text-xs text-[var(--muted)]">{campaign.location}</p>
                <div>
                  <div className="mb-2 h-2 rounded-full bg-[var(--brand-soft)]">
                    <div
                      className="h-2 rounded-full bg-[var(--brand)]"
                      style={{ width: campaign.progress }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <p className="font-semibold">{campaign.raised}</p>
                    <p className="text-[var(--muted)]">{campaign.progress} funded</p>
                  </div>
                </div>
                <Link
                  href={`/fund?campaign=${encodeURIComponent(campaign.title)}`}
                  className="block w-full rounded-full border border-[var(--brand)] py-2 text-center text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
                >
                  Fund
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
