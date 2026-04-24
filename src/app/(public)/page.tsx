"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { useEffect } from "react";
import { Leaf, Wrench, Boxes, DoorOpenIcon } from "lucide-react";

const fablabGoals = [
  {
    title: "Open Access Making",
    description:
      "A practical space to explore fabrication tools with guidance.",
    icon: DoorOpenIcon,
  },
  {
    title: "Skill Building",
    description:
      "Encourage hands-on learning through workshops, peer mentoring, and shared experimentation.",
    icon: Wrench,
  },
  {
    title: "Prototype Support",
    description:
      "Help turn class ideas and research concepts into usable models, parts, and test pieces.",
    icon: Boxes,
  },
  {
    title: "Sustainable Innovation",
    description:
      "Promote responsible making, repair thinking, and solutions that serve the campus and community.",
    icon: Leaf,
  },
];

export default function HomePage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "50px",
      },
    );

    const elements = document.querySelectorAll("[data-animate]");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <main className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[32px_32px] opacity-35" />

      <section className="relative mx-auto w-full max-w-7xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12 lg:px-10 lg:pt-14">

        {/* <div className="grid items-stretch gap-6 lg:grid-cols-12"> */}
          <div className="lg:col-span-7">
            <Card
              className="landing-reveal relative overflow-hidden rounded-none border-2 border-foreground bg-card p-6 shadow-[8px_8px_0_var(--foreground)] sm:p-8"
              data-animate
            >
              
            
              <h1 className="max-w-2xl text-4xl leading-[0.95] font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Make
                <br />
                Almost
                <br />
                Anything.
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-relaxed font-medium text-muted-foreground sm:text-base">
                A one-stop fabrication lab for bold experiments, rapid
                prototypes, and practical making with the UP Cebu community.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="rounded-none border-2 border-foreground bg-primary px-6 font-black text-primary-foreground shadow-[4px_4px_0_var(--foreground)] transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    Start A Project
                  </Button>
                </Link>
                <Link href="/services">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-none border-2 border-foreground bg-secondary px-6 font-black text-foreground shadow-[4px_4px_0_var(--foreground)] transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    Explore Services
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* <div className="lg:col-span-5">
            <Card
              className="landing-reveal relative h-full overflow-hidden rounded-none border-2 border-foreground bg-secondary p-3 shadow-[8px_8px_0_var(--foreground)]"
              data-animate
            >
              <div className="relative h-80 overflow-hidden border-2 border-foreground bg-primary-muted sm:h-95 lg:h-full lg:min-h-115">
                <Image
                  src="/fablab_mural.png"
                  alt="UP Cebu Fablab mural"
                  fill
                  priority
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-primary/25" />
                <div className="absolute left-3 top-3 border-2 border-foreground bg-light-yellow px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-foreground sm:text-xs">
                  Fabricate • Iterate • Share
                </div>
              </div>
            </Card>
          </div> */}
        </div>
      </section>

      

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div
          className="landing-reveal relative overflow-x-hidden bg-secondary/30"
          data-animate
        >
          <div className="pointer-events-none absolute top-12 bottom-0 left-0 z-0 hidden w-0.5 bg-foreground xl:block" />
          <div className="pointer-events-none absolute top-12 bottom-0 right-0 z-0 hidden w-0.5 bg-foreground xl:block" />
          <div className="pointer-events-none absolute left-0 right-0 top-12 z-0 hidden h-0.5 bg-foreground xl:block" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-0.5 bg-foreground" />
          <div className="relative z-10 grid xl:grid-cols-4">
            {fablabGoals.map((goal, index) => {
              const Icon = goal.icon;

              return (
                <article
                  key={goal.title}
                  className="relative px-7 pt-22 pb-10"
                >
                  {index < fablabGoals.length - 1 ? (
                    <div className="pointer-events-none absolute top-12 right-0 bottom-0 hidden w-0.5 bg-foreground xl:block" />
                  ) : null}

                  <div className="absolute left-7 top-12 z-20 flex h-18 w-18 -translate-y-1/2 items-center justify-center rounded-full border-2 border-foreground bg-background">
                    <Icon className="h-8 w-8 text-foreground" strokeWidth={2.25} />
                  </div>

                  <h3 className="text-2xl leading-none font-black uppercase tracking-[0.04em] text-foreground md:text-3xl">
                    {goal.title}
                  </h3>
                  <p className="mt-8 max-w-[32ch] text-base leading-[1.55] text-foreground/85 md:text-lg">
                    {goal.description}
                  </p>

                  
                </article>
              );
            })}
          </div>
        </div>
      </section>

    

      <section className="mx-auto w-full max-w-7xl px-4 pt-8 pb-14 sm:px-6 lg:px-10">
        <Card
          className="landing-reveal rounded-none border-2 border-foreground bg-primary p-7 text-primary-foreground shadow-[10px_10px_0_var(--foreground)] sm:p-10"
          data-animate
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-foreground/85">
            Ready To Make?
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl leading-[1.05] font-black sm:text-4xl">
            Join FabLab UP Cebu and turn your concept into a real prototype.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-primary-foreground/90 sm:text-base">
            Access practical equipment, mentorship, and a collaborative space
            built for students, researchers, and curious builders.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/login">
              <Button
                size="lg"
                className="rounded-none border-2 border-foreground bg-light-yellow px-6 font-black text-foreground shadow-[4px_4px_0_var(--foreground)] transition-transform duration-150 hover:-translate-y-0.5"
              >
                Get Started
              </Button>
            </Link>
            <Link href="/services">
              <Button
                size="lg"
                variant="outline"
                className="rounded-none border-2 border-foreground bg-background px-6 font-black text-foreground shadow-[4px_4px_0_var(--foreground)] transition-transform duration-150 hover:-translate-y-0.5"
              >
                See Services
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <footer className="border-t-2 border-foreground bg-secondary py-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          Built For Makers At Fablab
        </p>
      </footer>

      <style jsx>{`
        .landing-reveal {
          opacity: 0;
          transform: translateY(18px);
          transition: transform 0.5s cubic-bezier(0.2, 0.75, 0.2, 1),
            opacity 0.5s ease;
        }

        .landing-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </main>
  );
}
