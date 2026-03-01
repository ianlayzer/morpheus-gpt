import express from "express";
import cors from "cors";
import { sessionRouter } from "./routes/sessions";
import { requestLogger } from "./middleware/logger";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/sessions", sessionRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
