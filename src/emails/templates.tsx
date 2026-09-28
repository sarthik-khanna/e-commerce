import { Button, Column, Row, Section, Text } from "@react-email/components";
import { formatPrice } from "@/lib/format";
import { APP_NAME, EmailLayout, buttonStyle, textStyle } from "./layout";

export function WelcomeEmail({ name, appUrl }: { name: string; appUrl: string }) {
  return (
    <EmailLayout preview={`Welcome to ${APP_NAME}`} heading={`Welcome, ${name}!`}>
      <Text style={textStyle}>
        Your account is ready. Browse the catalog, save items to your cart and check out securely
        with Razorpay.
      </Text>
      <Button href={`${appUrl}/products`} style={buttonStyle}>
        Start shopping
      </Button>
    </EmailLayout>
  );
}

export function PasswordResetEmail({ resetUrl }: { resetUrl: string }) {
  return (
    <EmailLayout preview="Reset your password" heading="Reset your password">
      <Text style={textStyle}>
        We received a request to reset your password. This link expires in 1 hour. If you didn&apos;t
        request it, you can ignore this email.
      </Text>
      <Button href={resetUrl} style={buttonStyle}>
        Reset password
      </Button>
    </EmailLayout>
  );
}

type EmailOrder = {
  orderNumber: string;
  subtotal: number;
  tax: number;
  shippingFee: number;
  total: number;
  items: { productName: string; quantity: number; unitPrice: number }[];
};

export function OrderConfirmationEmail({
  name,
  order,
  orderUrl,
}: {
  name: string;
  order: EmailOrder;
  orderUrl: string;
}) {
  const line = (label: string, value: number, bold = false) => (
    <Row>
      <Column style={{ ...textStyle, fontWeight: bold ? 700 : 400 }}>{label}</Column>
      <Column align="right" style={{ ...textStyle, fontWeight: bold ? 700 : 400 }}>
        {formatPrice(value)}
      </Column>
    </Row>
  );

  return (
    <EmailLayout
      preview={`Order ${order.orderNumber} confirmed`}
      heading={`Thanks for your order, ${name}!`}
    >
      <Text style={textStyle}>
        We&apos;ve received your payment for order <strong>{order.orderNumber}</strong> and it&apos;s
        now being processed.
      </Text>
      <Section style={{ margin: "16px 0" }}>
        {order.items.map((item, i) => (
          <Row key={i}>
            <Column style={textStyle}>
              {item.productName} × {item.quantity}
            </Column>
            <Column align="right" style={textStyle}>
              {formatPrice(item.unitPrice * item.quantity)}
            </Column>
          </Row>
        ))}
      </Section>
      {line("Subtotal", order.subtotal)}
      {line("GST (18%)", order.tax)}
      {line("Shipping", order.shippingFee)}
      {line("Total", order.total, true)}
      <Section style={{ marginTop: 20 }}>
        <Button href={orderUrl} style={buttonStyle}>
          View order
        </Button>
      </Section>
    </EmailLayout>
  );
}

const STATUS_COPY: Record<string, string> = {
  SHIPPED: "Good news — your order is on its way.",
  DELIVERED: "Your order has been delivered. We hope you love it!",
  CANCELLED: "Your order has been cancelled. If you were charged, a refund has been initiated.",
  PROCESSING: "Your order is being prepared.",
};

export function OrderStatusEmail({
  name,
  orderNumber,
  status,
  orderUrl,
}: {
  name: string;
  orderNumber: string;
  status: string;
  orderUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Order ${orderNumber}: ${status.toLowerCase()}`}
      heading={`Order ${orderNumber} update`}
    >
      <Text style={textStyle}>Hi {name},</Text>
      <Text style={textStyle}>{STATUS_COPY[status] ?? `Your order status is now ${status}.`}</Text>
      <Button href={orderUrl} style={buttonStyle}>
        Track order
      </Button>
    </EmailLayout>
  );
}
