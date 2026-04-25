// IMPORTANT: this is a Convex Node Action
"use node";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { render } from "@react-email/render";
import { resend } from "./send";
import { FabLabEmail, FabLabEmailProps } from "./FabLabEmail";

/**
 * Sends a FabLab project confirmation email.
 * This action decouples the delivery logic from the visual template,
 * making it easy to swap out the styling in FabLabEmail.tsx.
 */
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    projectName: v.optional(v.string()),
    requesterName: v.optional(v.string()),
    machine: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    estimatedTime: v.optional(v.string()),
    dashboardUrl: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    pricing: v.optional(
      v.object({
        setupFee: v.number(),
        materialCost: v.number(),
        timeCost: v.number(),
        total: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { to, subject, ...props } = args;

    // 1. Render the React component to HTML
    // Swap this component to change the entire email's look and feel.
    // We cast status to any to match the expected ProjectStatusType if provided.
    const html = await render(<FabLabEmail {...(props as FabLabEmailProps)} />);

    // 2. Send the email using the Resend component
    await resend.sendEmail(ctx, {
      from: "Iskolab <notifications@fablab.harleyvan.com>",
      to,
      subject,
      html,
    });
  },
});
