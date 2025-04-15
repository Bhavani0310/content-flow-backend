const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, 
  });
  
  

//Org controllers
const orgController =  require('../Controller/organizer.controller.js');

// Importing middlewares
const verifyOrganizer =  require("../middleware/verifyOrganizer.js");


//org profile 
router.post('/handleYoutubeNameChange',verifyOrganizer ,orgController.handleYoutubeNameChange);

//org requests
router.post('/handleGetAllRequestsOrg',verifyOrganizer,orgController.handleGetAllEditorRequests);
router.post('/handleAcceptEditor',verifyOrganizer,orgController.handleAcceptEditor);
router.post('/handleRejectEditor',verifyOrganizer,orgController.handleRejectEditor);
router.post('/handleGetAllEditors',verifyOrganizer,orgController.handleGetAllEditors);
router.post('/handleCreateTask',verifyOrganizer,upload.array('media'),orgController.createTask);
router.post('/handleRemoveEditor',verifyOrganizer,orgController.handleRemoveEditor);
router.post('/handleGetAllTasks',verifyOrganizer,orgController.handleGetAllTasks);
router.post('/handleTaskViewDetail',verifyOrganizer,orgController.handleTaskViewDetail);
router.post('/handleRawVideoUpdate',verifyOrganizer,upload.array('videos'),orgController.handleUpdateRawVidoes);
router.post('/handleStatusChangeForTask',verifyOrganizer,orgController.handleTaskStatusChange);
router.post('/handleYoutubeUpload',verifyOrganizer,orgController.handleYoutubeUpload);

router.get("/channel-info/:userId",verifyOrganizer, orgController.getYouTubeChannelInfo);

router.get("/analytics/:userId",verifyOrganizer, orgController.getOrganizerAnalytics);
module.exports = router;