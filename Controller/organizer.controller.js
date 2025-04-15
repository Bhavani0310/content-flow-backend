require("dotenv").config();
const User = require("../Models/UsersModel");
const jwtToken = require("../Models/jwt-token.model");
const bcrypt = require("bcryptjs");
const { refreshGoogleAccessToken } = require("../helpers/googleTokenUtils");
const { signToken } = require("../helpers/jwt.helper");
const commonConstant = require("../constants/common.constant");
const HttpStatusConstant = require("../constants/http-message.constant");
const HttpStatusCode = require("../constants/http-code.constant");
const ResponseMessageConstant = require("../constants/response-message.constant");
const CommonConstant = require("../constants/common.constant");
const ErrorLogConstant = require("../constants/error-log.constant");
const sendEmail = require("../config/nodemailer");
const imageController = require("./image.controller");
const Org = require("../Models/OrganizerModel");
const TaskModel = require("../Models/TasksModel");
const { google } = require("googleapis");
const fs = require("fs");
const { decrypt, encrypt } = require("../helpers/cryptoUtils");
const path = require("path");
const axios = require("axios");

//org api's

// exports.handleYoutubeNameChange = async (req, res) => {
//   try {
//     console.log("handle youtube name change triggered");
//     const { newText } = req.body;
//     console.log(newText);
//     console.log(req.body);
//     const userId = req.user.id;
//     console.log("this is user id", userId);
//     const user = await Org.findOneAndUpdate(
//       {
//         _id: userId,
//       },
//       {
//         $set: {
//           youtubeChannelName: newText,
//         },
//       }
//     );
//     console.log(user);
//     console.log("channel name updated updated");
//     return res.status(200).json({ youtubeChannelName: newText });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ error: err });
//   }
// };
const mongoose = require("mongoose");

exports.handleYoutubeNameChange = async (req, res) => {
  try {
    console.log("handle youtube name change triggered");
    const { newText, id } = req.body;
    console.log(newText);
    console.log(req.body);

    console.log("this is user id", id);

    // Ensure `userId` is a valid ObjectId
    // if (!mongoose.Types.ObjectId.isValid(id)) {
    //   return res.status(400).json({ error: "Invalid user ID format" });
    // }

    const user = await Org.findOneAndUpdate(
      { _id: id },
      { $set: { youtubeChannelName: newText } },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(user);
    console.log("channel name updated");
    return res.status(200).json({ youtubeChannelName: newText });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.handleTotalTasksCount = async (req, res) => {
  try {
    console.log(req.body);
    const userId = req.user.id;
    console.log("this is user id", userId);
    const user = await User.findOne({
      _id: userId,
    });
    return res.status(200).json(user.assignedTasks.length);
  } catch (err) {
    return res.status(500).json({ error: err });
  }
};

// exports.handleGetWorkingOrganizers = async (req, res) => {
//   try {
//     console.log("handling all organizer details");
//     const userId = req.user.id;

//     // Fetch the current user (Editor)
//     const CurrentOrg = await Org.findOne({ _id: userId });

//     const editorDetails=[];
//     for(let i=0; i<CurrentOrg.editorIds.length; i++)
//     {
//         const editor = await User.find({_id:CurrentOrg.editorIds[i]});
//         let cnt=0;
//         for(let j=0;j<editor.assignedTasks.length;j++)
//         {
//             const currentTask = await TaskModel.find({_id:editor.assignedTasks[j]});
//             if(currentTask.organizerId==userId)
//             {
//                 cnt++;
//             }
//         }
//         editorDetails.append({editor.name,cnt});
//         return res.status(200).json({editorDetails});
//     }
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };
exports.handleGetWorkingEditors = async (req, res) => {
  try {
    console.log("handling all organizer details");
    const userId = req.user;

    // Fetch the curr.ent organizer (Editor)
    const CurrentOrg = await Org.findOne({ _id: userId });
    if (!CurrentOrg) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    const editorDetails = await Promise.all(
      CurrentOrg.editorIds.map(async (editorId) => {
        // Fetch editor details
        const editor = await User.findOne({ _id: editorId });
        if (!editor || !editor.assignedTasks) {
          return null; // Skip if editor or tasks are missing
        }

        // Count tasks assigned to this organizer
        let taskCount = 0;
        for (const taskId of editor.assignedTasks) {
          const currentTask = await TaskModel.findOne({ _id: taskId });
          if (currentTask && currentTask.organizerId == userId) {
            taskCount++;
          }
        }

        return { name: editor.name, taskCount };
      })
    );

    // Filter out null entries (in case of skipped editors)
    const filteredEditorDetails = editorDetails.filter(
      (detail) => detail !== null
    );

    return res.status(200).json({ editorDetails: filteredEditorDetails });
  } catch (err) {
    console.error("Error fetching working organizers:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.handleGetAllEditorRequests = async (req, res) => {
  try {
    console.log("all requests controller triggered");

    const { id } = req.body;
    console.log(id, req.body);
    const CurrentOrg = await Org.findOne({ _id: id });

    if (CurrentOrg === null) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    // Get all pending editors for this organizer
    const editorRequests = CurrentOrg.pendingEditors.map((request) => ({
      editorId: request.editorId,
      status: request.status,
    }));

    // Populate editor details if needed
    const populatedEditorRequests = await Promise.all(
      editorRequests.map(async (request) => {
        const editor = await User.findById(request.editorId).select(
          "name email description"
        );
        return {
          ...request, // Include other fields from the request (like `status`)
          ...editor._doc, // Spread the fields from the editor document directly
        };
      })
    );

    return res.status(200).json({ requests: populatedEditorRequests });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

//accpet editor to work
// exports.handleAcceptEditor = async (req, res) => {
//   try {
//     const { id, editorId } = req.body;
//     const CurrentOrg = await Org.findOne({ _id: id });
//     if (CurrentOrg === null) {
//       return res.status(404).json({ error: "Organizer not found" });
//     }
//     // Find the editor request
//     const editorRequest = CurrentOrg.pendingEditors.find(
//       (request) => request.editorId.toString() === editorId
//       );
//       if (editorRequest === null) {
//         return res.status(404).json({ error: "Editor request not found" });
//       }
//       //remove the editor from the pending editor array in org

//       //add that editor into the editorIds in the org

//       //remove all the other requests made by the editor to other organizers ..make it empty in editor schema

//       //fill the organizerId field with this org id in the editor schema

//       // send a mail to the ediotrs mail saying this orgniazer accpeted your requesting and now working for them

//       //

//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };
exports.handleAcceptEditor = async (req, res) => {
  try {
    const { id, editorId } = req.body;

    // Fetch the organizer by ID
    const CurrentOrg = await Org.findById(id);
    if (!CurrentOrg) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    // Find the editor request
    const editorRequestIndex = CurrentOrg.pendingEditors.findIndex(
      (request) => request.editorId.toString() === editorId
    );
    if (editorRequestIndex === -1) {
      return res.status(404).json({ error: "Editor request not found" });
    }

    // Remove the editor request from the pending editors array
    const [acceptedRequest] = CurrentOrg.pendingEditors.splice(
      editorRequestIndex,
      1
    );

    // Add the editor ID to the `editorIds` field
    CurrentOrg.editorIds.push(editorId);
    await CurrentOrg.save();

    // Fetch the editor and update their fields
    const editor = await User.findById(editorId);
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }

    await sendEmail({
      to: editor.email,
      subject: "Request Accepted",
      text: `Your request to work with ${CurrentOrg.name} has been accepted! Now you are working for ${CurrentOrg.name} organizer`,
      html: `<p>Your request to work with <strong>${CurrentOrg.name}</strong> has been accepted! Now you are working for ${CurrentOrg.name}</p>`,
    });

    // Remove all other requests made by the editor
    editor.organizerRequestStatus = [];

    // Assign this organizer's ID to the editor
    editor.organizerId = id;
    await editor.save();
    return res.status(200).json({
      message: `Editor ${editor.name} has been successfully accepted to work for organizer ${CurrentOrg.name}.`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
};

//handle reject the editor to work
exports.handleRejectEditor = async (req, res) => {
  try {
    const { id, editorId } = req.body;
    // Fetch the organizer by ID
    const CurrentOrg = await Org.findById(id);
    if (!CurrentOrg) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    // Find the editor request
    const editorRequestIndex = CurrentOrg.pendingEditors.findIndex(
      (request) => request.editorId.toString() === editorId
    );
    if (editorRequestIndex === -1) {
      return res.status(404).json({ error: "Editor request not found" });
    }

    // Remove the editor request from the pending editors array
    const [acceptedRequest] = CurrentOrg.pendingEditors.splice(
      editorRequestIndex,
      1
    );
    await CurrentOrg.save();
    const editor = await User.findById(editorId);
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }
    const orgRequestIndex = editor.organizerRequestStatus.findIndex(
      (request) => request.organizerId.toString() === id
    );
    editor.organizerRequestStatus.splice(orgRequestIndex, 1);
    await editor.save();
    await sendEmail({
      to: editor.email,
      subject: "Request Rejected",
      text: `Your request to work with ${CurrentOrg.name} has been rejected! `,
      html: `<p>Your request to work with <strong>${CurrentOrg.name}</strong> has been rejected! Better luck next time</p>`,
    });

    return res.status(200).json({
      message: `Editor ${editor.name} has been rejected to work for organizer ${CurrentOrg.name}.`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.handleGetAllEditors = async (req, res) => {
  try {
    const { id } = req.body;
    console.log(id);

    // Find the organizer by ID
    const CurrentOrg = await Org.findById(id);
    if (!CurrentOrg) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    // Get editor IDs from the organizer
    const editorIds = CurrentOrg.editorIds;
    console.log(editorIds);

    // Fetch editor details for each ID
    const editors = await User.find(
      { _id: { $in: editorIds } }, // Match all IDs in the editorIds array
      { _id: 1, name: 1, description: 1, rating: 1, email: 1 } // Only select `id` and `name` fields
    );

    // Send the editor details to the frontend
    return res.status(200).json({ editors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// exports.handleCreateTask=async(req,res)=>{
//   try{
//     const {id,taskname,selectedEditor,deadline,description}=req.body;

//   }catch(err)
//   {
//     return res.status(500).json({ error: err.message });
//   }
// }
exports.createTask = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    const { taskName, organizerId, editorId, taskDetails, deadline, priority } = req.body;
    
    // Now, we expect mediaFiles (both videos and images) in the request payload.
    const mediaFiles = req.files; 

    if (!mediaFiles || mediaFiles.length === 0) {
      return res.status(400).json({ error: "No media files provided" });
    }

    // Ensure the organizer exists.
    const organizer = await Org.findById(organizerId);
    if (!organizer) {
      return res.status(404).json({ error: "Organizer not found" });
    }
    console.log("Organizer found");

    // Ensure the editor exists.
    const editor = await User.findById(editorId);
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }
    console.log("Editor found");

    // Upload files to S3 (or your CDN).
    // Separate uploads for videos and images.
    const uploadedVideos = [];
    const uploadedImages = [];

    for (const file of mediaFiles) {
      if (file.mimetype.startsWith("video/")) {
        const videoUrl = await imageController.uploadVideoToS3(
          file.originalname,
          file,
          organizerId
        );
        if (videoUrl) {
          uploadedVideos.push(videoUrl);
        }
      } else if (file.mimetype.startsWith("image/")) {
        const imageUrl = await imageController.uploadImageToS3(
          file.originalname,
          file,
          organizerId
        );
        if (imageUrl) {
          uploadedImages.push(imageUrl);
        }
      }
    }

    // Create a new task.
    // Note: This assumes your Task model has been updated to include a field for rawImageUrl.
    const newTask = new TaskModel({
      taskName,
      organizerId,
      editorId,
      rawVideoUrl: uploadedVideos,
      rawImageUrl: uploadedImages,  // New field for images.
      taskDetails,
      taskStatus: "not_started",
      priority,
      deadline: deadline || null,
    });

    await newTask.save();

    // Update the organizer's taskscreated field.
    organizer.tasksCreated.push({ taskid: newTask._id, editorId });
    await organizer.save();

    // Update the editor's assigned tasks.
    editor.assignedTasks.push(newTask._id);
    await editor.save();

    // Send email to the editor regarding the new task.
    await sendEmail({
      to: editor.email,
      subject: `New Task Assigned: ${taskName}`,
      text: `Hello ${editor.name},

You have been assigned a new task by ${organizer.name}.

Task Details:
${taskDetails}

Raw Videos:
${uploadedVideos.join("\n")}

Raw Images:
${uploadedImages.join("\n")}

Deadline: ${deadline || "No deadline specified"}

Best regards,
${organizer.name}`,
      html: `<p>Hello ${editor.name},</p>
<p>You have been assigned a new task by ${organizer.name}.</p>
<p><strong>Task Details:</strong><br/>${taskDetails}</p>
<p><strong>Raw Videos:</strong><br/>${uploadedVideos.join("<br/>")}</p>
<p><strong>Raw Images:</strong><br/>${uploadedImages.join("<br/>")}</p>
<p><strong>Deadline:</strong> ${deadline || "No deadline specified"}</p>
<p>Best regards,<br/>${organizer.name}</p>`,
    });

    return res.status(201).json({
      message: "Task created successfully",
      task: newTask,
    });
  } catch (error) {
    console.error("Error in createTask:", error);
    return res.status(500).json({ error: error.message });
  }
};


exports.handleRemoveEditor = async (req, res) => {
  try {
    const { id, editorId } = req.body;
    console.log(req.body);

    // Validate IDs
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(editorId)) {
      return res.status(400).json({ error: "Invalid ID(s) provided" });
    }

    // Fetch the organizer by ID
    const organizer = await Org.findById(id);
    if (!organizer) {
      return res.status(404).json({ error: "Organizer not found" });
    }
    console.log("Organizer found:", organizer);

    // Remove the editor from the organizer's editorIds array
    const editors = organizer.editorIds;
    const index = editors.findIndex((editor) => editor.equals(editorId));
    if (index !== -1) {
      editors.splice(index, 1);
    }
    await organizer.save();

    // Fetch the editor by ID and update their organizerId
    const editor = await User.findById(editorId);
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }
    console.log("Editor found:", editor);

    editor.organizerId = null; // Use null instead of an empty string
    await editor.save();

    return res.status(200).json({ message: "Editor removed successfully" });
  } catch (err) {
    console.error("Error in handleRemoveEditor:", err);
    return res.status(500).json({ error: err.message });
  }
};

// exports.handleGetAllTasks = async(req,res)=>{
//   try{
//     const {id}=req.body();
//     const orgId=id;

//     //i want to return the tasks as active, pending, completed based on the  task status
//     // if  task status is in progress and deadline not crossed then it is active
//     // if task status is still in progress after the deadline is crossed then it is pending
//     // if task status is completed then it is completed
//     // i want  id,name,editor,deadline for every task in the response

//   }
//   catch(err)
//   {
//     console.log(err);
//     return res.status(500).json({ err: err.message });
//   }
// }

const taskStatusDisplayMap = {
  assigned: "Not Started",
  in_progress: "In Progress",
  needs_review: "Needs Review",
  completed: "Done",
  not_started: "Not Started",
};

exports.handleGetAllTasks = async (req, res) => {
  try {
    const { id } = req.body; // Organizer ID
    const orgId = id;

    // Validate orgId
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ error: "Invalid Organizer ID" });
    }

    // Fetch all tasks for the organizer
    const tasks = await TaskModel.find({ organizerId: orgId }).populate(
      "editorId",
      "name"
    );
    console.log("tasks are", tasks);

    if (!tasks.length) {
      return res
        .status(404)
        .json({ message: "No tasks found for this organizer" });
    }

    const now = new Date();
  

    const formatted = tasks.map((task) => ({
      id: task._id.toString(),
      title: task.taskName,
      editor: task.editorId?.name || "Unassigned",
      status:
        task.taskStatus === "assigned"
          ? "Not Started"
          : task.taskStatus === "in_progress"
          ? "In Progress"
          : task.taskStatus === "completed"
          ? "Done"
          : task.taskStatus === "need_review"
          ? "Need Review"
          : "Not Started",
      due: task.deadline
        ? new Date(task.deadline).toDateString().slice(4)
        : "No Due Date",
      priority: task.priority || "Medium", // Add priority if included in schema
    }));

    res.json({ success: true, tasks: formatted });
  } catch (err) {
    console.error("Error in handleGetAllTasks:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.handleTaskViewDetail = async (req, res) => {
  try {
    const { taskId } = req.body;

    // Find the task by ID and populate the editorId to fetch the editor's name
    const taskdetails = await TaskModel.findById(taskId)
      .populate("editorId", "name") // Populate editor's name only
      .select("taskName deadline taskStatus rawVideoUrl editedVideoUrls");

    if (!taskdetails) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Format the response
    const response = {
      taskName: taskdetails.taskName,
      editorName: taskdetails.editorId?.name || "N/A", // If editorId is null
      deadline: taskdetails.deadline,
      taskStatus: taskdetails.taskStatus,
      rawUrls: taskdetails.rawVideoUrl,
      editedUrls: taskdetails.editedVideoUrls,
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error in handleTaskViewDetail:", err);
    return res.status(500).json({ err: err.message });
  }
};

exports.handleUpdateRawVidoes = async (req, res) => {
  try {
    console.log(req.body.taskId);
    console.log(req);
    const taskId = req.body.taskId;
    const orgId = req.body.orgId;
    const description = req.body.description;

    const files = req.files;
    console.log(files);

    if (!taskId || !files || files.length === 0) {
      return res.status(400).json({ error: "Task ID and files are required" });
    }

    // Upload videos to S3 and collect URLs
    const uploadedUrls = [];
    for (const file of files) {
      const uploadedUrl = await imageController.uploadVideoToS3(
        file.originalname,
        file,
        taskId
      );
      if (!uploadedUrl) {
        return res.status(500).json({ error: "Failed to upload video to S3" });
      }
      uploadedUrls.push(uploadedUrl);
    }

    // Update the raw video URLs in the task document
    const task = await TaskModel.findByIdAndUpdate(
      taskId,
      {
        $push: { rawVideoUrl: { $each: uploadedUrls } },
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Find the editor's details
    const editor = await User.findById(task.editorId);
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }
    const organizer = await Org.findById(task.organizerId);
    if (organizer === null) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    // Use the sendEmail utility to notify the editor
    await sendEmail({
      to: editor.email,
      subject: `New Raw Videos Added: ${task.taskName}`,
      text: `Hello ${
        editor.name
      },\n\nNew raw video files have been uploaded for the task "${
        task.taskName
      } by the organizer ${
        organizer.name
      } ".\n\nDescription: ${description}\n\nYou can download the raw video files here:\n${uploadedUrls.join(
        "\n"
      )}\n\nDeadline: ${
        task.deadline ? task.deadline.toDateString() : "No deadline specified"
      }\n\nBest regards,\nYour Team`,
      html: `<p>Hello ${editor.name},</p>
             <p>New raw video files have been uploaded for the task "<strong>${
               task.taskName
             }</strong>".</p>
             <p><strong>Description:</strong> ${description}</p>
             <p>You can download the raw video files here:</p>
             <ul>${uploadedUrls
               .map((url) => `<li><a href="${url}">${url}</a></li>`)
               .join("")}</ul>
             <p><strong>Deadline:</strong> ${
               task.deadline
                 ? task.deadline.toDateString()
                 : "No deadline specified"
             }</p>
             <p>Best regards,<br/>Your Team</p>`,
    });

    return res.status(200).json({
      message: "Videos uploaded and editor notified",
      uploadedUrls,
    });
  } catch (err) {
    console.error("Error in handleUpdateRawVidoes:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.handleTaskStatusChange = async (req, res) => {
  try {
    const id = req.body.id; // Organizer ID

    const taskId = req.body.taskId;
    const newStatus = req.body.newStatus;

    const taskdetail = await TaskModel.findById(taskId);
    if (taskdetail.taskStatus === newStatus) {
      return res.status(200).json({
        message: `Already in the ${newStatus}`,
      });
    }
    taskdetail.taskStatus = newStatus;
    await taskdetail.save();
    return res.status(200).json({
      message: `Status changed to ${newStatus}`,
    });
  } catch (err) {
    console.error("Error status change", err);
    return res.status(500).json({ error: err.message });
  }
};

// Handle YouTube video upload
exports.handleYoutubeUpload = async (req, res) => {
  try {
    // Extract the necessary details from the request body
    const { videoUrl, title, description, taskId, videoId } = req.body;
    const googleId = req.user.id;
    const { accessToken } = req.user; // Assuming access token is stored in req.user

    // Create the OAuth2 client with the user's access token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:4000/auth/google/callback"
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    // Initialize the YouTube API client
    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    // Set up video metadata
    const videoMetadata = {
      snippet: {
        title: title,
        description: description,
        tags: ["video", "upload"], // You can add more tags if needed
      },
      status: {
        privacyStatus: "private", // Can be 'public', 'private', or 'unlisted'
      },
    };

    // Fetch video from S3
    const s3response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream", // Stream the video content
    });

    console.log(s3response.data);

    // Upload the video
    const response = await youtube.videos.insert(
      {
        part: "snippet,status",
        requestBody: {
          snippet: {
            title: title,
            description: description,
            categoryId: "22", // Category ID for 'People & Blogs'; change as needed
          },
          status: {
            privacyStatus: "public", // Can be 'private', 'public', or 'unlisted'
          },
        },
        media: {
          body: s3response.data, // Streamed video data
        },
      },
      {
        // Options for upload progress
        onUploadProgress: (event) => {
          console.log(
            `Uploaded ${((event.bytesRead / event.totalBytes) * 100).toFixed(
              2
            )}%`
          );
        },
      }
    );

    const updatedTask = await TaskModel.findOneAndUpdate(
      {
        _id: taskId, // Find the task by taskId
        "editedVideoUrls._id": videoId, // Find the video in the editedVideoUrls array by videoId
      },
      {
        $set: {
          "editedVideoUrls.$.uploadedToYoutube": true, // Set the uploadedToYoutube field to true
          "editedVideoUrls.$.url": `https://www.youtube.com/watch?v=${response.data.id}`,
        },
      },
      {
        new: true, // Return the updated document
      }
    );
    if (!updatedTask) {
      throw new Error("Task or video not found");
    }

    // Handle the response from the YouTube API
    console.log("Video uploaded successfully:", response.data);
    res.status(200).json({
      message: "Video uploaded successfully!",
      videoId: response.data.id, // The video ID returned by YouTube
    });
  } catch (err) {
    console.error("Error uploading video", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getYouTubeChannelInfo = async (req, res) => {
  const { userId } = req.params;

  try {
    const organizer = await Org.findById(userId);
    if (!organizer || !organizer.youtubeAccessToken) {
      return res.status(404).json({ error: "Organizer or token not found" });
    }

    let accessToken = decrypt(organizer.youtubeAccessToken);

    try {
      // Try fetching with current access token
      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/channels",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            part: "snippet,contentDetails,statistics",
            mine: true,
          },
        }
      );

      const channelInfo = response.data.items[0];
      organizer.youtubeChannelName = channelInfo.snippet.title;
      organizer.youtubeChannelId = channelInfo.id;
      await organizer.save();

      return res.json({ success: true, channel: channelInfo });
    } catch (error) {
      // If token is expired, try refreshing it
      if (error.response?.status === 401 && organizer.youtubeRefreshToken) {
        const {
          encryptedAccessToken,
          accessToken: newAccessToken,
          expiresIn,
        } = await refreshGoogleAccessToken(organizer.youtubeRefreshToken);

        organizer.youtubeAccessToken = encryptedAccessToken;
        organizer.youtubeTokenExpiry = new Date(Date.now() + expiresIn * 1000);
        await organizer.save();

        // Retry request with new token
        const retryResponse = await axios.get(
          "https://www.googleapis.com/youtube/v3/channels",
          {
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
            },
            params: {
              part: "snippet,contentDetails,statistics",
              mine: true,
            },
          }
        );

        const channelInfo = retryResponse.data.items[0];
        organizer.youtubeChannelName = channelInfo.snippet.title;
        organizer.youtubeChannelId = channelInfo.id;
        await organizer.save();

        return res.json({ success: true, channel: channelInfo });
      }

      // If it's not a 401 error or can't refresh
      console.error(
        "YouTube API error:",
        error.response?.data || error.message
      );
      return res.status(500).json({ error: "Failed to fetch channel info" });
    }
  } catch (err) {
    console.error("Internal Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getOrganizerAnalytics = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fake data for demo/review
    const analytics = {
      totalPosts: 115,
      postStatus: {
        draft: 20,
        scheduled: 45,
        published: 50,
      },
      engagement: [
        { name: "Mon", value: 20 },
        { name: "Tue", value: 50 },
        { name: "Wed", value: 80 },
        { name: "Thu", value: 40 },
        { name: "Fri", value: 90 },
      ],
      platformSplit: [
        { name: "Instagram", value: 60 },
        { name: "LinkedIn", value: 25 },
        { name: "YouTube", value: 15 },
      ],
      upcomingPosts: [
        { title: "Reel for Product X", date: "Apr 12", platform: "Instagram" },
        { title: "Launch Teaser", date: "Apr 14", platform: "YouTube" },
        { title: "LinkedIn Update", date: "Apr 15", platform: "LinkedIn" },
      ],
    };

    res.json({ success: true, analytics });
  } catch (err) {
    console.error("Analytics Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load analytics" });
  }
};
