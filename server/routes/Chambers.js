const express = require("express");
const router = express.Router();
const { Chamber } = require("../models");

router.get("/", async (req, res) => {
  const listOfChambers = await Chamber.findAll();
  res.json(listOfChambers);
});

router.post("/", async (req, res) => {
  const chamber = req.body;
  const newChamber = await Chamber.create(chamber); // Capture the created object
  res.json(newChamber); // Send the object WITH the ID back to React
});

module.exports = router;