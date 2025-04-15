const express = require("express");
const router = express.Router();
const contentController = require("../Controller/content.controller");
const verifyOrganizer = require("../middleware/verifyOrganizer")
router.post("/",verifyOrganizer, contentController.createContent);
router.get("/", verifyOrganizer,contentController.getAllContent);
router.get("/:id",verifyOrganizer, contentController.getContentById);
router.put("/:id", verifyOrganizer,contentController.updateContent);
router.delete("/:id",verifyOrganizer, contentController.deleteContent);
router.get("/pipeline/:userId",contentController.getContentPipeline);

// Update status of a content item
router.put("/status/:contentId", contentController.updateContentStatus);
module.exports = router;
