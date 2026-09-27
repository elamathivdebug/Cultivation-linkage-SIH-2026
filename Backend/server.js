const express = require("express");
const cors = require("cors");

const routes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: "Something went wrong",
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    `Cultivation Linkage API running on http://localhost:${PORT}`
  );
});
