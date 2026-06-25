import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs";
import dotenv from "dotenv";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api", router);

initWebSocket(server);

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
