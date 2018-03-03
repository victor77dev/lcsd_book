var express = require("express");
var app = express();

port = process.env.PORT || 4000

app.listen(port, () => console.log("Creating app listening on port " + port))

var getJsonResponse = require("./getJsonResponse")

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use("/api", getJsonResponse)
