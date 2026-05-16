const express = require("express");
const router = express.Router();
const { Stock } = require("../models");

router.get("/", async (req, res) => {
  const listOfStocks = await Stock.findAll();
  res.json(listOfStocks);
});

router.post("/", async (req, res) => {
  const stock = req.body;
  const newStock = await Stock.create(stock);
  res.json(newStock);
});

module.exports = router;