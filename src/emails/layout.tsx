import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

export const APP_NAME = "Nexus Commerce";

export function EmailLayout({
  preview,
  heading,
  children,
}: {
  preview: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "Arial, sans-serif", padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 8, padding: 32, maxWidth: 560 }}>
          <Text style={{ color: "#4f46e5", fontWeight: 700, fontSize: 18, margin: 0 }}>{APP_NAME}</Text>
          <Heading style={{ fontSize: 22, color: "#18181b", margin: "16px 0" }}>{heading}</Heading>
          <Section>{children}</Section>
          <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />
          <Text style={{ color: "#71717a", fontSize: 12, margin: 0 }}>
            You are receiving this email because you have an account with {APP_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const textStyle = { color: "#3f3f46", fontSize: 14, lineHeight: "22px" };
export const buttonStyle = {
  backgroundColor: "#4f46e5",
  color: "#ffffff",
  borderRadius: 6,
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
};
