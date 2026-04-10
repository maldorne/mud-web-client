/** Message sent to the proxy to initiate a connection */
export interface ConnectMessage {
  connect: 1;
  utf8: 1;
  mccp: number;
  debug: number;
  ttype: string;
  name: string;
  /* Named route (preferred for cluster MUDs) */
  mud?: string;
  /* Legacy routing: host + port */
  host?: string;
  port?: number;
  /* Extra fields the proxy accepts */
  client?: string;
  mxp?: number;
}

/** Binary data message */
export interface BinMessage {
  bin: number[];
}

/** MSDP message */
export interface MsdpMessage {
  msdp: { key: string; val: string | string[] };
}

/** GMCP message */
export interface GmcpMessage {
  gmcp: string;
}

/** Chat message */
export interface ChatMessage {
  chat: 1;
  channel: string;
  msg: string;
}

export type ProxyMessage =
  | ConnectMessage
  | BinMessage
  | MsdpMessage
  | GmcpMessage
  | ChatMessage;

/** Layout mode */
export type LayoutMode = 'embed' | 'full';

/** Client configuration derived from query parameters and defaults */
export interface ClientConfig {
  proxy: string;
  host: string;
  port: number;
  mud: string | null;
  name: string;
  ttype: string;
  debug: boolean;
  separator: string;
  mode: LayoutMode;
}

/** Parsed GMCP event */
export interface GmcpEvent {
  module: string;
  data: unknown;
}

/** Parsed MSDP event */
export interface MsdpEvent {
  pairs: MsdpPair[];
}

export interface MsdpPair {
  key: string;
  value: string;
}

/** Telnet protocol constants */
export const TEL = {
  IAC: 0xff,
  WILL: 0xfb,
  WONT: 0xfc,
  DO: 0xfd,
  DONT: 0xfe,
  SB: 0xfa,
  SE: 0xf0,
  ECHO: 0x01,
  MSDP: 0x45,
  MXP: 0x5b,
  GMCP: 0xc9,
  ATCP: 0xc8,
  /* MSDP sub-values */
  MSDP_VAR: 0x01,
  MSDP_VAL: 0x02,
} as const;
