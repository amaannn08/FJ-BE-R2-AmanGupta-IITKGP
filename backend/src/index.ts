import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import {connectDB} from "./config/db"
import authRoutes from "./routes/authRoutes";
dotenv.config();
const app = express()

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;



app.use("/auth", authRoutes);

async function startServer(){
    try {
        await connectDB();
        app.listen(PORT,()=>{
            console.log(`Server Running on Port ${PORT}`);
        })
    } catch (error) {
        console.log("Failed to Start Server");
        process.exit(1);
    }
}

startServer();