declare module "splunk-logging-hec" {
  interface SplunkLoggerConfig {
    token: string;
    url: string;
  }

  interface SendPayload {
    message: Record<string, unknown>;
    metadata?: {
      sourcetype?: string;
      source?: string;
      index?: string;
      host?: string;
    };
  }

  class SplunkLogger {
    constructor(config: SplunkLoggerConfig);
    send(payload: SendPayload): void;
    error: (err: Error, context: unknown) => void;
  }

  export { SplunkLogger as Logger };
}
