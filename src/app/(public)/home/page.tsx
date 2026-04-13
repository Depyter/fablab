"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { useEffect } from "react";

const fablabGoals = [
    {
        title: "Open Access Making",
        description: "A practical space to explore fabrication tools with guidance.",
        shape: (
            <div className="relative h-28 w-28">
                <div
                    className="absolute left-8 bottom h-10 w-10 rotate-45 rounded-sm"
                    style={{ backgroundColor: "var(--chart-6)" }}
                />
                <div
                    className="absolute left-8 top-16 h-10 w-10 rotate-45 rounded-sm"
                    style={{ backgroundColor: "var(--chart-6)" }}
                />
                <div
                    className="absolute  top-8 h-10 w-10 rotate-45 rounded-sm"
                    style={{ backgroundColor: "var(--chart-3)" }}
                />
                <div
                    className="absolute left-16 top-8 h-10 w-10 rotate-45 rounded-sm"
                    style={{ backgroundColor: "var(--primary)" }}
                />
            </div>
        ),
    },
    {
        title: "Skill Building",
        description: "Encourage hands-on learning through workshops, peer mentoring, and shared experimentation.",
        shape: (
            <div className="relative h-28 w-28">
                <div
                    className="absolute left-1 top-8 h-14 w-14 rounded-l-full rounded-r-none"
                    style={{ backgroundColor: "var(--primary)" }}
                />
                <div
                    className="absolute left-8 top-2 h-14 w-14 rounded-r-full rounded-l-none"
                    style={{ backgroundColor: "var(--chart-1)" }}
                />
            </div>
        ),
    },
    {
        title: "Prototype Support",
        description: "Help turn class ideas and research concepts into usable models, parts, and test pieces.",
        shape: (
            <div className="relative h-28 w-28">
                <div
                    className="absolute left-7 top-2 h-14 w-14 rotate-45 rounded-sm bg-chart-3"
                    
                />
                <div
                    className="absolute left-7 top-10 h-14 w-14 rounded-full bg-chart-1"
                 
                />
                <div className="absolute left-9.5 top-6.5">
                    <svg viewBox="0 0 100 100" width={35} height={35} aria-hidden="true">
                        <path
                            d="M50 0
                            C56 22 78 44 100 50
                            C78 56 56 78 50 100
                            C44 78 22 56 0 50
                            C22 44 44 22 50 0Z"
                            fill="var(--chart-2)"
                            
                        />
                    </svg>
                  
                </div>
            </div>
        ),
    },
    {
        title: "Sustainable Innovation",
        description: "Promote responsible making, repair thinking, and solutions that serve the campus and community.",
        shape: (
            <div className="relative h-28 w-28">
                <div
                    className="absolute left-6 top-0 h-14 w-14 rounded-tl-full rounded-tr-none rounded-br-none rounded-bl-none"
                    style={{ backgroundColor: "var(--chart-3)" }}
                />
                <div
                    className="absolute left-6 top-14 h-14 w-14 rounded-bl-full rounded-br-none rounded-tr-none rounded-tl-none"
                    style={{ backgroundColor: "var(--chart-3)" }}
                />
                <div
                    className="absolute left-0 top-6 h-14 w-14 rounded-sm"
                    style={{ backgroundColor: "var(--chart-1)" }}
                />
                <div
                    className="absolute left-14 top-6 h-14 w-14 rounded-sm"
                    style={{ backgroundColor: "var(--chart-5)" }}
                />
            </div>
        ),
    },
];

export default function HomePage() {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("animate-in");
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: "50px",
            }
        );

        const elements = document.querySelectorAll("[data-animate]");
        elements.forEach((el) => observer.observe(el));

        return () => {
            elements.forEach((el) => observer.unobserve(el));
        };
    }, []);

    return (
        <main className="bg-background font-sans">
            <section className="relative h-[calc(100svh-4rem)] shrink-2 overflow-hidden bg-primary-muted">
                <Image
                    src="/fablab_mural.png"
                    alt="Hero Image"
                    fill
                    priority
                    className="object-cover object-center"
                />
                <div className="absolute inset-0 flex items-end bg-primary/50">
                    <div className="mx-auto w-full max-w-7xl px-4 pb-15 sm:px-6 lg:px-10">
                        <h1
                            className="text-3xl font-bold text-background sm:text-4xl md:text-5xl"
                            data-animate="fade-up"
                        >
                            Make Almost Anything.
                        </h1>
                        <p
                            className="mt-2 max-w-2xl text-sm text-background/90 sm:text-base"
                            data-animate="fade-up"
                        >
                            Your One-Stop Fabrication Lab
                        </p>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
            
                <div className="grid gap-12 sm:grid-cols-2 xl:grid-cols-4">
                    {fablabGoals.map((goal, index) => (
                        <div
                            key={goal.title}
                            className="flex flex-col items-center text-center"
                            data-animate="fade-up"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="mb-6 flex h-28 w-28 items-center justify-center">
                                {goal.shape}
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">{goal.title}</h3>
                            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                                {goal.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-14 text-center" data-animate="fade-up">
                    <Link href="/services">
                        <Button size="lg" className="rounded-lg">
                            Explore Services
                        </Button>
                    </Link>
                </div>
            </section>

            <section
                className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10"
                data-animate="fade-up"
            >
                <Card className="rounded-lg bg-linear-to-r from-primary/10 to-accent/10 p-8 shadow">
                    <h3 className="mb-3 text-2xl font-bold">Ready to Create?</h3>
                    <p className="mb-6 max-w-2xl text-muted-foreground">
                        Join us at FabLab UP Cebu and bring your ideas to life. With our state-of-the-art
                        equipment and supportive community, there's almost nothing you can't make.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/login">
                            <Button className="rounded-lg">Get Started</Button>
                        </Link>
                        <Link href="/services">
                            <Button variant="outline" className="rounded-lg">
                                Learn More
                            </Button>
                        </Link>
                    </div>
                </Card>
            </section>

            <footer className="border-t border-sidebar-border/10 bg-background py-16 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/30">
                    Built for Makers at Fablab
                </p>
            </footer>
        </main>
    );
}
