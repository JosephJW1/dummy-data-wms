const express = require("express");
const router = express.Router();
const { Product } = require("../models");

router.get("/", async (req, res) => {
  const listOfProducts = await Product.findAll();
  res.json(listOfProducts);
});

router.post("/", async (req, res) => {
  const product = req.body;
  const newProduct = await Product.create(product);
  res.json(newProduct);
});

module.exports = router;