const express = require("express");
const router = express.Router();
const { Location } = require("../models");

router.get("/", async (req, res) => {
  const listOfLocations = await Location.findAll();
  res.json(listOfLocations);
});

router.post("/", async (req, res) => {
  const location = req.body;
  const newLocation = await Location.create(location);
  res.json(newLocation);
});

module.exports = router;