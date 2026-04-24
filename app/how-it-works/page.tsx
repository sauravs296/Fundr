import Image from "next/image";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const onboardingSteps = [
  {
    id: "01",
    title: "Create Your Account",
    detail:
      "Sign up with email and password, then complete your profile details from onboarding.",
    visual: "Auth + profile setup",
  },
  {
    id: "02",
    title: "Connect Wallet",
    detail:
      "Link your Freighter address (optional at first) so fundraising and future transactions are wallet-aware.",
    visual: "Wallet identity ready",
  },
  {
    id: "03",
    title: "Launch Fundraiser",
    detail:
      "Create campaign story, target, deadline, and media. Publish with a clear purpose and milestones.",
    visual: "Campaign published",
  },
  {
    id: "04",
    title: "Collect & Update",
    detail:
      "Receive contributions, post updates, and keep supporters informed from your creator dashboard.",
    visual: "Live progress + trust",
  },
];

const fundraiserTypes = [
  {
    title: "Emergency Relief",
    description:
      "Rapid-response funding for disaster aid, shelter, and urgent community recovery.",
  },
  {
    title: "Medical Support",
    description:
      "Fund surgeries, treatment plans, diagnostics, and long-term recovery care.",
  },
  {
    title: "Education & Scholarships",
    description:
      "Back tuition, books, school kits, mentorship programs, and digital learning.",
  },
  {
    title: "Charity & NGO Missions",
    description:
      "Support verified organizations running food, healthcare, or local impact initiatives.",
  },
];

const steps = [
  {
    id: "01",
    title: "Plan Campaign",
    details:
      "Set your goal, timeline, and story. Add visuals that communicate urgency and purpose.",
  },
  {
    id: "02",
    title: "Share Campaign",
    details:
      "Publish your link and invite supporters across social channels, groups, and direct messages.",
  },
  {
    id: "03",
    title: "Track Donations",
    details:
      "Monitor progress, donor count, and campaign metrics with a transparent funding timeline.",
  },
  {
    id: "04",
    title: "Deliver Impact",
    details:
      "Withdraw and deploy funds according to campaign terms, then post updates to keep trust high.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <ScrollReveal />

      <main>
        <section className="grid-soft border-b border-[var(--line)] py-16 md:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-8 text-center">
            <p className="inline-block rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-1 text-sm font-medium text-[var(--brand-strong)] reveal-up">
              How It Works
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-bold leading-tight reveal-up delay-100 md:text-6xl">
              From signup to social impact in a clear, creator-friendly flow.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[var(--muted)] reveal-up delay-200 md:text-lg">
              Fundr guides individuals and charities through account setup,
              fundraiser creation, and transparent progress tracking.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-bold reveal-up">Signup & Fundraiser Flow</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--muted)] reveal-up delay-100 md:text-base">
              Point-by-point journey showing how users start fundraising and how contributions are used.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {onboardingSteps.map((step, index) => (
              <article
                key={step.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 reveal-up lift-hover"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[var(--brand)]">Step {step.id}</p>
                    <h3 className="mt-1 text-2xl font-semibold">{step.title}</h3>
                  </div>
                  <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                    {step.visual}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] py-16">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
            <h2 className="text-center text-4xl font-bold reveal-up">What You Can Fund on Fundr</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {fundraiserTypes.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 reveal-zoom lift-hover"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm text-[var(--muted)]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
          <div className="grid gap-8 md:grid-cols-[1fr_1.15fr] md:items-start">
            <div className="reveal-zoom">
              <Image
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
                alt="Team collaborating on fundraising campaign strategy"
                width={1200}
                height={800}
                className="h-96 w-full rounded-3xl border border-[var(--line)] object-cover"
              />
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <article
                  key={step.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 reveal-up lift-hover"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <p className="text-sm font-semibold text-[var(--brand)]">{step.id}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{step.title}</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">{step.details}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
