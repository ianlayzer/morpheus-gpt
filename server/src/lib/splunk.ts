import { Logger as SplunkLogger } from "splunk-logging-hec";

const splunkUrl = process.env.SPLUNK_HEC_URL;
const splunkToken = process.env.SPLUNK_HEC_TOKEN;

let logger: SplunkLogger | null = null;

if (splunkUrl && splunkToken) {
  logger = new SplunkLogger({
    token: splunkToken,
    url: splunkUrl,
  });

  logger.error = (err: Error, context: unknown) => {
    console.error("Splunk HEC error:", err.message);
  };
}

export function logToSplunk(event: Record<string, unknown>): void {
  if (!logger) return;

  logger.send({
    message: event,
    metadata: {
      sourcetype: "_json",
    },
  });
}
