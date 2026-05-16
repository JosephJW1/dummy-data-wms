const express = require("express");
const router = express.Router();
const { Transaction } = require("../models");

router.get("/", async (req, res) => {
  const listOfTransactions = await Transaction.findAll();
  res.json(listOfTransactions);
});

router.post("/", async (req, res) => {
  const transaction = req.body;
  const newTransaction = await Transaction.create(transaction);
  res.json(newTransaction);
});

module.exports = router;