const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const EXE_PATH = path.join(__dirname, "../../dist/NetworkScannerWizard.exe");

router.get("/download/scanner", (req, res) => {
  if (!fs.existsSync(EXE_PATH)) {
    return res.status(404).json({ error: "Scanner executable not found" });
  }

  res.download(EXE_PATH, "NetworkScannerWizard.exe");
});

module.exports = router;
