import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}))
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(cookieParser());

// Routes
import testRoute from "./routes/test.route";
import userRoute from "./routes/user.route";
import postRoute from "./routes/post.route";

app.use("/api/v1/test", testRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/posts", postRoute);

export default app;