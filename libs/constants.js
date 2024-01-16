export const PORT = process.env.VCR_PORT || process.env.NERU_APP_PORT || 3000;
export const DEBUG = process.env.DEBUG;
export const ZENDESK_BASE_URL =
  DEBUG == "true"
    ? process.env.DEBUG_ZENDESK_BASE_URL
    : process.env.ZENDESK_BASE_URL;
export const ZENDESK_TOKEN =
  DEBUG == "true" ? process.env.DEBUG_ZENDESK_TOKEN : process.env.ZENDESK_TOKEN;
export const ZENDESK_USERNAME =
  DEBUG == "true"
    ? process.env.DEBUG_ZENDESK_USERNAME
    : process.env.ZENDESK_USERNAME;

export const APP_URL = process.env.VCR_INSTANCE_PUBLIC_URL;
export const AI_STUDIO_AGENT_ID = process.env.AI_STUDIO_AGENT_ID;

// secrets
export const INTERNAL_API_KEY =
  DEBUG == "true"
    ? process.env.DEBUG_INTERNAL_API_KEY
    : process.env.INTERNAL_API_KEY;

export const AI_STUDIO_API_KEY = process.env.AI_STUDIO_API_KEY;

export const ZENDESK_BASE64_AUTH = Buffer.from(
  `${ZENDESK_USERNAME}/token:${ZENDESK_TOKEN}`
).toString("base64");

// ai studio
export const AI_STUDIO_AUTH_URL = "https://stairway.ai.vonage.com";
export const AI_STUDIO_OUTBOUND_API_URL =
  "https://studio-api-eu.ai.vonage.com/messaging/conversation";

// reader license
export const DYNAMSOFT_LICENSE = process.env.DYNAMSOFT_LICENSE;
