import express from "express";
const app = express();
app.get("/", (req, res) => {
  res.send("Hello World");
});
app.use("static", express.static("dist"));

app.listen(8080);
