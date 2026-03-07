const {uploadScan} = require("../ScanController");
const Device = require("../../Models/device");
const Vulnerability = require("../../Models/vulnerability");
const nvdService = require("../../Services/nvdService");
const llmService = require("../../Services/llmService");

jest.mock("../../Models/device");
jest.mock("../../Models/vulnerability");
jest.mock("../../Services/nvdService");
jest.mock("../../Services/llmService");

