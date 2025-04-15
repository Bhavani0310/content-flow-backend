const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, 
  });
  
  

//Editor controllers
const authControllerEditor = require("../Controller/autheditor.controller.js");
const editorController =  require('../Controller/Editor.controller.js');

// Importing middlewares
const verifyEditor =  require("../middleware/verifyEditor.js");


//editor profile 
// router.post('/EditorProfileImageChange',upload.single("image"),editorController.handleImageUpdate);
router.post('/EditorDescChange',verifyEditor ,editorController.handleTextChange);
router.get('/EditorTotalTasksCount',verifyEditor,editorController.handleTotalTasksCount);
router.post("/EditorProfileImageChange", verifyEditor,upload.single("profilePic"), editorController.handleImageupload);

//organizers page
router.get('/AllOrganizers',verifyEditor,editorController.handleGetAllOrganizers);
router.post('/editor/requestOrganizer',verifyEditor,editorController.handleRequestToOrg);

//tasks
router.post('/handleGetAllTasksEditor',verifyEditor,editorController.handleGetAllTasks);
router.post('/handleGetTaskDetail',verifyEditor,editorController.handleGetTaskDetail);
router.post('/handleUpdateEditedVideos',verifyEditor,upload.array('videos'),editorController.handleUpdateEditedVideos);



module.exports = router;