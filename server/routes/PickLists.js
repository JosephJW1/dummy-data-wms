const express = require("express");
const router = express.Router();
const { PickList } = require("../models");

router.get("/", async (req, res) => {
  const listOfPickLists = await PickList.findAll();
  res.json(listOfPickLists);
});

router.post("/", async (req, res) => {
  const pickList = req.body;
  const newPickList = await PickList.create(pickList);
  res.json(newPickList);
});

module.exports = router;