import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import connectDB from "database";
import router from "./routes";
import { initWebSocket } from "./socket";

dotenv.config({ path: "./.env" });

const app = express();
const server = http.createServer(app);

connectDB();

fs.mkdirSync("./public/temp", { recursive: true });

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use((req, res, next) => {
  console.log(`[Request Log] ${req.method} ${req.url} Content-Type: ${req.headers["content-type"]}`);
  next();
});
app.use(express.json());
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && "body" in err) {
    req.body = {};
    next();
    return;
  }
  next(err);
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api", router);
app.use("/public", express.static(path.join(process.cwd(), "public")));

initWebSocket(server);

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
