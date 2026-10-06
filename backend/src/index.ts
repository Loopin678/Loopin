import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiRoutes from "./routes/index";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api", apiRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Server on http://localhost:${port}`));

/**
 * /index/ auth
 * 
 * 
 */