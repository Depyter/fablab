import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Button,
  Preview,
  Font,
} from "@react-email/components";
import { ProjectStatus, type ProjectStatusType } from "../constants";

// ── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  bgDeep: "#f0eeff",
  bgMain: "#faf9ff",
  bgCard: "#ffffff",
  teal: "#0fa896",
  tealLight: "#72cbc1",
  magenta: "#9d1a58",
  magentaLight: "#fcedf2",
  amber: "#ebaa57",
  amberLight: "#fef3dc",
  purple: "#534ab7",
  textPrimary: "#14112b",
  textMuted: "#5a5478",
  textDim: "#9d99b8",
  border: "rgba(80,60,160,0.12)",
  black: "#000000",
  white: "#ffffff",
};

// ── Shared style objects ──────────────────────────────────────────────────────
const S = {
  body: {
    backgroundColor: C.bgDeep,
    margin: 0,
    padding: 0,
    fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
  },

  outerWrap: {
    backgroundColor: C.bgDeep,
    padding: "40px 16px",
  },

  card: {
    backgroundColor: C.bgCard,
    border: `4px solid ${C.black}`,
    maxWidth: "640px",
    margin: "0 auto",
  },

  headerSection: {
    backgroundColor: C.bgMain,
    borderBottom: `4px solid ${C.black}`,
    padding: "8px 40px",
    textAlign: "center" as const,
  },

  wordmark: {
    fontSize: "20px",
    fontWeight: 900,
    letterSpacing: "-0.05em",
    lineHeight: "1",
    color: C.textPrimary,
    textTransform: "uppercase" as const,
    margin: 0,
    display: "inline-block",
  },

  tagline: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: C.textDim,
    margin: "0 0 0 12px",
    display: "inline-block",
  },

  projectTitleSection: {
    backgroundColor: C.bgCard,
    padding: "0 40px 0 40px",
  },

  statusPill: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    padding: "3px 8px",
    display: "inline-block",
    margin: "0 0 12px 0",
  },

  projectTitle: {
    fontSize: "32px",
    fontWeight: 900,
    letterSpacing: "-0.04em",
    lineHeight: "1.1",
    textTransform: "uppercase" as const,
    color: C.black,
    margin: 0,
  },

  bodySection: {
    backgroundColor: C.bgMain,
    padding: "32px",
  },

  sectionLabel: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.24em",
    textTransform: "uppercase" as const,
    color: C.textDim,
    margin: "0 0 8px 0",
  },

  bodyHeading: {
    fontSize: "20px",
    fontWeight: 900,
    letterSpacing: "-0.03em",
    textTransform: "uppercase" as const,
    color: C.textPrimary,
    margin: "0 0 12px 0",
    lineHeight: "1.1",
  },

  bodyText: {
    fontSize: "14px",
    fontWeight: 300,
    color: C.textMuted,
    lineHeight: "1.6",
    margin: "0 0 20px 0",
  },

  detailLabel: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    color: C.textDim,
    margin: "0 0 4px 0",
  },

  detailValue: {
    fontSize: "15px",
    fontWeight: 900,
    letterSpacing: "-0.02em",
    color: C.textPrimary,
    margin: 0,
  },

  notesBlock: {
    backgroundColor: C.magentaLight,
    borderLeft: `4px solid ${C.magenta}`,
    padding: "16px 20px",
    margin: "24px 0 0 0",
  },

  pricingSection: {
    padding: "24px 32px",
    backgroundColor: C.bgCard,
    borderTop: `4px solid ${C.black}`,
    borderBottom: `4px solid ${C.black}`,
  },

  pricingRow: {
    margin: "4px 0",
  },

  pricingLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: C.textMuted,
    textTransform: "uppercase" as const,
  },

  pricingValue: {
    fontSize: "11px",
    fontWeight: 900,
    color: C.textPrimary,
    textAlign: "right" as const,
  },

  totalLabel: {
    fontSize: "14px",
    fontWeight: 900,
    color: C.black,
    textTransform: "uppercase" as const,
  },

  totalValue: {
    fontSize: "18px",
    fontWeight: 900,
    color: C.magenta,
    textAlign: "right" as const,
  },

  timelineSection: {
    backgroundColor: C.bgCard,
    padding: "32px 40px",
    borderBottom: `4px solid ${C.black}`,
  },

  ctaSection: {
    padding: "48px 40px",
    backgroundColor: C.bgMain,
    textAlign: "center" as const,
    borderBottom: `8px solid ${C.black}`,
  },

  ctaButton: {
    backgroundColor: C.amber,
    color: C.black,
    border: `4px solid ${C.black}`,
    padding: "16px 40px",
    fontSize: "14px",
    fontWeight: 900,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    textDecoration: "none",
    display: "inline-block",
  },

  footerSection: {
    backgroundColor: C.bgCard,
    padding: "30px 40px",
    textAlign: "center" as const,
  },

  footerText: {
    fontSize: "16px",
    fontWeight: 900,
    letterSpacing: "-0.02em",
    color: C.black,
    margin: 0,
    textTransform: "uppercase" as const,
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TimelineStep({
  step,
  label,
  status,
  last = false,
}: {
  step: string;
  label: string;
  status: "complete" | "active" | "pending";
  last?: boolean;
}) {
  const dotColor =
    status === "complete" ? C.teal : status === "active" ? C.amber : C.border;
  const dotBorder =
    status === "pending" ? `3px solid ${C.textDim}` : `3px solid ${dotColor}`;
  const labelColor = status === "pending" ? C.textDim : C.textPrimary;
  const stepColor =
    status === "complete" ? C.teal : status === "active" ? C.amber : C.textDim;

  return (
    <Row style={{ marginBottom: last ? 0 : "0px" }}>
      <Column
        style={{ width: "40px", verticalAlign: "top", paddingTop: "2px" }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: status === "pending" ? "transparent" : dotColor,
            border: dotBorder,
            margin: "0 auto",
          }}
        />
        {!last && (
          <div
            style={{
              width: "3px",
              height: "36px",
              backgroundColor: status === "complete" ? C.teal : C.border,
              margin: "4px auto 0",
            }}
          />
        )}
      </Column>
      <Column style={{ paddingLeft: "12px", paddingBottom: last ? 0 : "24px" }}>
        <div
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            color: stepColor,
            margin: "0 0 2px 0",
          }}
        >
          {step}
        </div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: labelColor,
            margin: 0,
          }}
        >
          {label}
        </div>
      </Column>
    </Row>
  );
}

// ── Main Email ────────────────────────────────────────────────────────────────

export interface FabLabEmailProps {
  projectName?: string;
  requesterName?: string;
  machine?: string;
  scheduledDate?: string;
  estimatedTime?: string;
  dashboardUrl?: string;
  status?: ProjectStatusType;
  notes?: string;
  pricing?: {
    setupFee: number;
    materialCost: number;
    timeCost: number;
    total: number;
  };
}

const statusConfig: Record<
  ProjectStatusType,
  {
    heroLabel: string;
    timeline: readonly ("complete" | "active" | "pending")[];
    color: string;
    bg: string;
  }
> = {
  [ProjectStatus.PENDING]: {
    heroLabel: "Request Received",
    timeline: ["complete", "active", "pending", "pending", "pending"],
    color: C.black,
    bg: C.amber,
  },
  [ProjectStatus.APPROVED]: {
    heroLabel: "Project Approved",
    timeline: ["complete", "complete", "active", "pending", "pending"],
    color: C.white,
    bg: C.teal,
  },
  [ProjectStatus.COMPLETED]: {
    heroLabel: "Fabrication Complete",
    timeline: ["complete", "complete", "complete", "active", "pending"],
    color: C.white,
    bg: C.teal,
  },
  [ProjectStatus.PAID]: {
    heroLabel: "Ready for Pickup",
    timeline: ["complete", "complete", "complete", "complete", "active"],
    color: C.white,
    bg: C.teal,
  },
  [ProjectStatus.REJECTED]: {
    heroLabel: "Request Declined",
    timeline: ["complete", "pending", "pending", "pending", "pending"],
    color: C.white,
    bg: C.magenta,
  },
  [ProjectStatus.CANCELLED]: {
    heroLabel: "Project Cancelled",
    timeline: ["complete", "pending", "pending", "pending", "pending"],
    color: C.black,
    bg: C.bgDeep,
  },
};

export function FabLabEmail({
  projectName = "Laser-Cut Acrylic Signage",
  requesterName = "Maria Santos",
  machine = "Laser Cutter (CO₂ 60W)",
  scheduledDate = "May 2, 2026",
  estimatedTime = "2 hrs 30 min",
  dashboardUrl = "https://fablab.harleyvan.com/dashboard/projects",
  status = ProjectStatus.PENDING,
  notes,
  pricing = {
    setupFee: 150,
    materialCost: 450,
    timeCost: 300,
    total: 900,
  },
}: FabLabEmailProps) {
  const config = statusConfig[status] || statusConfig[ProjectStatus.PENDING];

  const formatCurrency = (val: number) => `₱${val.toLocaleString()}`;

  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Arial Black"
          fallbackFontFamily="Arial"
          webFont={undefined}
          fontWeight={900}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        {config.heroLabel}: {projectName}
      </Preview>

      <Body style={S.body}>
        <Container style={S.card}>
          {/* ── Small Header ───────────────────────────────────────────── */}
          <Section style={S.headerSection}>
            <Row>
              <Text style={S.wordmark}>Make Almost Anything</Text>
            </Row>
          </Section>

          {/* ── Body message ───────────────────────────────────────────── */}
          <Section style={S.bodySection}>
            <div
              style={{
                ...S.statusPill,
                backgroundColor: config.bg,
                color: config.color,
              }}
            >
              {config.heroLabel}
            </div>
            <Text style={S.projectTitle}>{projectName}</Text>
            <Text style={S.sectionLabel}>
              Hello, {requesterName.split(" ")[0]}
            </Text>
            <Text style={S.bodyHeading}>
              {status === ProjectStatus.PENDING
                ? "We've received your request."
                : status === ProjectStatus.APPROVED
                  ? "You're all set to make."
                  : status === ProjectStatus.PAID
                    ? "Your project is ready."
                    : "Project Status Update"}
            </Text>
            <Text style={S.bodyText}>
              {status === ProjectStatus.PENDING
                ? "Your project request has been submitted and is now being reviewed by our team. We'll notify you as soon as there's an update."
                : status === ProjectStatus.APPROVED
                  ? "Your project request has been approved. Your machine slot is reserved — please arrive 10 minutes early for a safety briefing."
                  : status === ProjectStatus.PAID
                    ? "Your project has been completed and payment has been verified. You can now visit the lab to pick up your items."
                    : "There has been an update to your project status. Please check your dashboard for more details."}
            </Text>

            {/* Simple Details */}
            <div
              style={{
                marginTop: "32px",
              }}
            >
              <Row>
                <Column style={{ width: "50%", paddingBottom: "20px" }}>
                  <Text style={S.detailLabel}>Requester</Text>
                  <Text style={S.detailValue}>{requesterName}</Text>
                </Column>
                <Column style={{ width: "50%", paddingBottom: "20px" }}>
                  <Text style={S.detailLabel}>Machine</Text>
                  <Text style={S.detailValue}>{machine}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={{ width: "50%" }}>
                  <Text style={S.detailLabel}>Date</Text>
                  <Text style={S.detailValue}>{scheduledDate}</Text>
                </Column>
                <Column style={{ width: "50%" }}>
                  <Text style={S.detailLabel}>Duration</Text>
                  <Text style={S.detailValue}>{estimatedTime}</Text>
                </Column>
              </Row>
            </div>

            {notes && (
              <Section style={S.notesBlock}>
                <Text style={{ ...S.detailLabel, color: C.magenta }}>
                  Notes from Lab
                </Text>
                <Text
                  style={{ ...S.bodyText, margin: 0, color: C.textPrimary }}
                >
                  {notes}
                </Text>
              </Section>
            )}
          </Section>

          {/* ── Pricing Breakdown ──────────────────────────────────────── */}
          <Section style={S.pricingSection}>
            <Text style={{ ...S.sectionLabel, marginBottom: "16px" }}>
              Cost Estimate
            </Text>
            <Row style={S.pricingRow}>
              <Column style={S.pricingLabel}>Setup Fee</Column>
              <Column style={S.pricingValue}>
                {formatCurrency(pricing.setupFee)}
              </Column>
            </Row>
            <Row style={S.pricingRow}>
              <Column style={S.pricingLabel}>Material Cost</Column>
              <Column style={S.pricingValue}>
                {formatCurrency(pricing.materialCost)}
              </Column>
            </Row>
            <Row style={S.pricingRow}>
              <Column style={S.pricingLabel}>Time/Usage Cost</Column>
              <Column style={S.pricingValue}>
                {formatCurrency(pricing.timeCost)}
              </Column>
            </Row>
            <Row style={{ marginTop: "16px", paddingTop: "12px" }}>
              <Column style={S.totalLabel}>Estimated Total</Column>
              <Column style={S.totalValue}>
                {formatCurrency(pricing.total)}
              </Column>
            </Row>
          </Section>

          {/* ── Timeline ───────────────────────────────────────────────── */}
          <Section style={S.timelineSection}>
            <Text style={{ ...S.sectionLabel, marginBottom: "20px" }}>
              Project Status
            </Text>
            <TimelineStep
              step="Step 01"
              label="Request Submitted"
              status={config.timeline[0]}
            />
            <TimelineStep
              step="Step 02"
              label="Admin Review"
              status={config.timeline[1]}
            />
            <TimelineStep
              step="Step 03"
              label="Fabrication"
              status={config.timeline[2]}
            />
            <TimelineStep
              step="Step 04"
              label="Payment"
              status={config.timeline[3]}
            />
            <TimelineStep
              step="Step 05"
              label="Ready for Pickup"
              status={config.timeline[4]}
              last
            />
          </Section>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <Section style={S.footerSection}>
            <Text style={S.footerText}>
              FabLab UP Cebu • Cebu City • © 2026
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
