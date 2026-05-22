const express = require("express");
const app = express();
const cors = require("cors");
const db = require("./models");

// ---> INITIATE BACKGROUND SERVICES <---
require("./services/replenishmentService");
require("./services/putAwayService");
require("./services/pickListService");

app.use(express.json());
app.use(cors());

// --- Routers ---
const chambersRouter = require("./routes/Chambers");
app.use("/chambers", chambersRouter);

const locationsRouter = require("./routes/Locations");
app.use("/locations", locationsRouter);

const productsRouter = require("./routes/Products");
app.use("/products", productsRouter);

const stocksRouter = require("./routes/Stocks");
app.use("/stocks", stocksRouter);

const usersRouter = require("./routes/Users");
app.use("/users", usersRouter);

const pickListsRouter = require("./routes/PickLists");
app.use("/picklists", pickListsRouter);

const tasksRouter = require("./routes/Tasks");
app.use("/tasks", tasksRouter);

const transactionsRouter = require("./routes/Transactions");
app.use("/transactions", transactionsRouter);

// --- Server Start & DB Sync ---
const PORT = process.env.PORT || 3001; // Uses Railway's port, or 3001 locally

db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 WMS Server running on port ${PORT}`);
  });
});