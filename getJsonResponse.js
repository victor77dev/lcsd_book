var express = require("express");
var router = express.Router();
var checkBooking = require("./checkBooking.js");

router.get("/update", function(req, res, next) {
  console.log("get update request");
  checkBooking.updateCourtInfo();
  res.send("updating");
});

router.get("/", function(req, res, next) {
  console.log("get request");
  checkBooking.readAllLastSummary().then((allSummary) => {
    console.log("get allSummary");
    res.json(allSummary);
  })
  .catch((error) => {
    res.send(error);
  });
});

router.get("/date/:date", function(req, res, next) {
  date = req.params.date;
  console.log("get request date: " + date);
  checkBooking.readLastSummary(date).then((summary) => {
    console.log("get summary");
    res.json(summary);
  })
  .catch((error) => {
    res.send(error);
  });
});
module.exports = router;
