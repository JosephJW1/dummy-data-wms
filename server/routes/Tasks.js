const express = require("express");
const router = express.Router();
const { Task } = require("../models");

router.get("/", async (req, res) => {
  const listOfTasks = await Task.findAll();
  res.json(listOfTasks);
});

router.post("/", async (req, res) => {
  const task = req.body;
  const newTask = await Task.create(task);
  res.json(newTask);
});

module.exports = router;