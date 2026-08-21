import "dotenv/config"
import express from "express"
import cookieParser from "cookie-parser"
//import authRoutes from "./routes/auth.routes";
import apiRoutes from "./routes/index";
import { prisma } from "./library/prisma"

//dotenv.config();

const app = express();
app.use(express.json());

app.use(cookieParser());

// app.get("/health", (req, res)=>{
//     res.json({ok: true});
// });

//app.use("/auth", authRoutes);

app.use("/api", apiRoutes);

const port = process.env.PORT || 4000;

app.listen(port, ()=> console.log(`Server on: ${port}`));

/**
 * /index/ auth
 * 
 * 
 */