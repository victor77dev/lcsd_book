var express = require("express");
var app = express();

port = process.env.PORT || 4000

app.listen(port, () => console.log("Creating app listening on port " + port))

var getJsonResponse = require("./getJsonResponse")
app.use("/api", getJsonResponse)
