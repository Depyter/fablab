"use client";

import type {
  ButtonHTMLAttributes,
  FocusEventHandler,
  MouseEventHandler,
  Ref,
} from "react";
import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

type BaseProps = {
  label: string;
  className?: string;
  href?: string;
  baseBackground?: string;
  hoverBackground?: string;
  baseTextColor?: string;
  hoverTextColor?: string;
};

type GsapArrowButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function GsapArrowButton({
  label,
  className,
  href,
  baseBackground = "var(--background)",
  hoverBackground = "var(--fab-magenta)",
  baseTextColor = "var(--foreground)",
  hoverTextColor = "#ffffff",
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: GsapArrowButtonProps) {
  const rootRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    const labelNode = labelRef.current;
    if (!root || !fill || !labelNode) return;

    gsap.set(root, {
      backgroundColor: baseBackground,
      color: baseTextColor,
    });
    gsap.set(fill, {
      scaleY: 0,
      transformOrigin: "center bottom",
      backgroundColor: hoverBackground,
    });
    gsap.set(labelNode, {
      color: baseTextColor,
    });

    timelineRef.current = gsap
      .timeline({
        paused: true,
        defaults: { ease: "power2.out", duration: 0.18 },
      })
      .to(
        fill,
        {
          scaleY: 1,
        },
        0,
      )
      .to(
        labelNode,
        {
          color: hoverTextColor,
        },
        0.04,
      );
  }, [baseBackground, hoverBackground, baseTextColor, hoverTextColor]);

  const play = () => timelineRef.current?.play();
  const reverse = () => timelineRef.current?.reverse();

  const handleMouseEnter: MouseEventHandler<
    HTMLAnchorElement | HTMLButtonElement
  > = (event) => {
    play();
    onMouseEnter?.(event as never);
  };

  const handleMouseLeave: MouseEventHandler<
    HTMLAnchorElement | HTMLButtonElement
  > = (event) => {
    reverse();
    onMouseLeave?.(event as never);
  };

  const handleFocus: FocusEventHandler<
    HTMLAnchorElement | HTMLButtonElement
  > = (event) => {
    play();
    onFocus?.(event as never);
  };

  const handleBlur: FocusEventHandler<HTMLAnchorElement | HTMLButtonElement> = (
    event,
  ) => {
    reverse();
    onBlur?.(event as never);
  };

  const content = (
    <>
      <span ref={fillRef} className="absolute inset-0 z-0" />
      <span
        ref={labelRef}
        className="relative z-10 block text-center text-2xl leading-none font-black uppercase tracking-tighter sm:text-3xl w-full"
      >
        {label}
      </span>
    </>
  );

  const sharedClassName = cn(
    "inline-flex min-h-20 w-fit max-w-full shrink-0 items-center overflow-hidden border-4 border-black px-5 py-4 text-left outline-none sm:min-h-24 sm:px-6 sm:py-5",
    "relative",
    className,
  );

  if (href) {
    return (
      <Link
        ref={rootRef as Ref<HTMLAnchorElement>}
        href={href}
        className={sharedClassName}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={rootRef as Ref<HTMLButtonElement>}
      className={sharedClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {content}
    </button>
  );
}
