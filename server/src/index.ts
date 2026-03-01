import express from "express";
import cors from "cors";
import { sessionRouter } from "./routes/sessions";
import { authRouter } from "./routes/auth";
import { requestLogger } from "./middleware/logger";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/auth", authRouter);
app.use("/sessions", sessionRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
