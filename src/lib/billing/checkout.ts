import type Stripe from 'stripe';

export function checkoutSessionParameters(input: {
  customerId: string;
  userId: string;
  priceId: string;
  appUrl: string;
  brandLogoFileId?: string;
}): Stripe.Checkout.SessionCreateParams {
  return {
    mode: 'subscription',
    customer: input.customerId,
    client_reference_id: input.userId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${input.appUrl}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.appUrl}/pricing?checkout=canceled`,
    branding_settings: {
      background_color: '#F8F5EE',
      button_color: '#102B29',
      border_style: 'rounded',
      display_name: 'Dakhbar Desk',
      font_family: 'noto_serif',
      ...(input.brandLogoFileId ? { logo: { type: 'file', file: input.brandLogoFileId } } : {}),
    },
    custom_text: {
      submit: {
        message: 'Test mode only. No real charge is processed. Dakhbar Terms and Privacy Policy are available on the site before checkout.',
      },
    },
    metadata: { userId: input.userId },
    subscription_data: { metadata: { userId: input.userId } },
  };
}
