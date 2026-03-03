import { Request, Response, NextFunction } from "express";
import { logToSplunk } from "../lib/splunk";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, path } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const route = req.baseUrl + (req.route?.path ?? path);
    console.log(`${method} ${route} ${res.statusCode} ${duration}ms`);

    logToSplunk({
      event: "canonical-api-line",
      method,
      route,
      path,
      statusCode: res.statusCode,
      duration,
      userId: (req as any).userId ?? null,
      timestamp: new Date().toISOString(),
    });
  });

  next();
}
