import "dotenv/config"
import express from "express"
import { prisma } from "./library/prisma"

//dotenv.config();

const app = express();
app.use(express.json());

app.get("/health", (req, res)=>{
    res.json({ok: true});
});

const port = process.env.PORT || 4000;

app.listen(port, ()=> console.log(`Server on: ${port}`));
