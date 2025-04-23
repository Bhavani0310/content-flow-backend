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

const mongoose = require("mongoose");

exports.handleYoutubeNameChange = async (req, res) => {
  try {
    console.log("handle youtube name change triggered");
    const { newText, id } = req.body;
    console.log(newText);
    console.log(req.body);

    console.log("this is user id", id);

    const user = await Org.findOneAndUpdate(
      { _id: id },
      { $set: { youtubeChannelName: newText } },
      { new: true }
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

exports.handleGetWorkingEditors = async (req, res) => {
  try {
    console.log("handling all organizer details");
    const userId = req.user;

    const CurrentOrg = await Org.findOne({ _id: userId });
    if (!CurrentOrg) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    const editorDetails = await Promise.all(
      CurrentOrg.editorIds.map(async (editorId) => {
        const editor = await User.findOne({ _id: editorId });
        if (!editor || !editor.assignedTasks) {
          return null;
        }

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

    const editorRequests = CurrentOrg.pendingEditors.map((request) => ({
      editorId: request.editorId,
      status: request.status,
    }));

    const populatedEditorRequests = await Promise.all(
      editorRequests.map(async (request) => {
        const editor = await User.findById(request.editorId).select(
          "name email description"
        );
        return {
          ...request,
          ...editor._doc,
        };
      })
    );

    return res.status(200).json({ requests: populatedEditorRequests });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.handleAcceptEditor = async (req, res) => {
  try {
    const { id, editorId } = req.body;

    const CurrentOrg = await Org.findById(id);
    if (!CurrentOrg) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    const editorRequestIndex = CurrentOrg.pendingEditors.findIndex(
      (request) => request.editorId.toString() === editorId
    );
    if (editorRequestIndex === -1) {
      return res.status(404).json({ error: "Editor request not found" });
    }

    const [acceptedRequest] = CurrentOrg.pendingEditors.splice(
      editorRequestIndex,
      1
    );

    CurrentOrg.editorIds.push(editorId);
    await CurrentOrg.save();

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

    editor.organizerRequestStatus = [];

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

exports.handleRejectEditor = async (req, res) => {
  try {
    const { id, editorId } = req.body;

    const CurrentOrg = await Org.findById(id);
    if (!CurrentOrg) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    const editorRequestIndex = CurrentOrg.pendingEditors.findIndex(
      (request) => request.editorId.toString() === editorId
    );
    if (editorRequestIndex === -1) {
      return res.status(404).json({ error: "Editor request not found" });
    }

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

    const CurrentOrg = await Org.findById(id);
    if (!CurrentOrg) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    const editorIds = CurrentOrg.editorIds;
    console.log(editorIds);

    const editors = await User.aggregate([
      {
        $match: {
          _id: {
            $in: editorIds.map((editorId) =>new mongoose.Types.ObjectId(editorId)),
          },
        },
      },
      {
        $lookup: {
          from: "tasks",
          localField: "assignedTasks",
          foreignField: "_id",
          as: "tasks",
        },
      },
      {
        $addFields: {
          totalAssigned: { $size: "$assignedTasks" },
          completedTasks: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $eq: ["$$task.taskStatus", "completed"] },
              },
            },
          },
          needReviewTasks: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $eq: ["$$task.taskStatus", "need_review"] },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          rating: 1,
          email: 1,
          isActive: 1,
          totalAssigned: 1,
          completedTasks: 1,
          needReviewTasks: 1,
        },
      },
    ]);

    return res.status(200).json({ editors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    const { taskName, organizerId, editorId, taskDetails, deadline, priority } =
      req.body;

    const mediaFiles = req.files;

    if (!mediaFiles || mediaFiles.length === 0) {
      return res.status(400).json({ error: "No media files provided" });
    }

    const organizer = await Org.findById(organizerId);
    if (!organizer) {
      return res.status(404).json({ error: "Organizer not found" });
    }
    console.log("Organizer found");

    const editor = await User.findById(editorId);
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }
    console.log("Editor found");

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

    const newTask = new TaskModel({
      taskName,
      organizerId,
      editorId,
      rawVideoUrl: uploadedVideos,
      rawImageUrl: uploadedImages,
      taskDetails,
      taskStatus: "not_started",
      priority,
      deadline: deadline || null,
    });

    await newTask.save();

    organizer.tasksCreated.push({ taskid: newTask._id, editorId });
    await organizer.save();

    editor.assignedTasks.push(newTask._id);
    await editor.save();

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

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(editorId)) {
      return res.status(400).json({ error: "Invalid ID(s) provided" });
    }

    const organizer = await Org.findById(id);
    if (!organizer) {
      return res.status(404).json({ error: "Organizer not found" });
    }
    console.log("Organizer found:", organizer);

    const editors = organizer.editorIds;
    const index = editors.findIndex((editor) => editor.equals(editorId));
    if (index !== -1) {
      editors.splice(index, 1);
    }
    await organizer.save();

    const editor = await User.findById(editorId);
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }
    console.log("Editor found:", editor);

    editor.organizerId = null;
    await editor.save();

    return res.status(200).json({ message: "Editor removed successfully" });
  } catch (err) {
    console.error("Error in handleRemoveEditor:", err);
    return res.status(500).json({ error: err.message });
  }
};

const taskStatusDisplayMap = {
  assigned: "Not Started",
  in_progress: "In Progress",
  needs_review: "Needs Review",
  completed: "Done",
  not_started: "Not Started",
};

exports.handleGetAllTasks = async (req, res) => {
  try {
    const { id } = req.body;
    const orgId = id;

    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ error: "Invalid Organizer ID" });
    }

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
      priority: task.priority || "Medium",
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

    const taskdetails = await TaskModel.findById(taskId)
      .populate("editorId", "name")
      .select("taskName deadline taskStatus rawVideoUrl editedVideoUrls");

    if (!taskdetails) {
      return res.status(404).json({ message: "Task not found" });
    }

    const response = {
      taskName: taskdetails.taskName,
      editorName: taskdetails.editorId?.name || "N/A",
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

    const editor = await User.findById(task.editorId);
    if (!editor) {
      return res.status(404).json({ error: "Editor not found" });
    }
    const organizer = await Org.findById(task.organizerId);
    if (organizer === null) {
      return res.status(404).json({ error: "Organizer not found" });
    }

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
    const id = req.body.id;

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

exports.handleYoutubeUpload = async (req, res) => {
  try {
    const { videoUrl, title, description, taskId, videoId } = req.body;
    const googleId = req.user.id;
    const { accessToken } = req.user;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:4000/auth/google/callback"
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    const videoMetadata = {
      snippet: {
        title: title,
        description: description,
        tags: ["video", "upload"],
      },
      status: {
        privacyStatus: "private",
      },
    };

    const s3response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
    });

    console.log(s3response.data);

    const response = await youtube.videos.insert(
      {
        part: "snippet,status",
        requestBody: {
          snippet: {
            title: title,
            description: description,
            categoryId: "22",
          },
          status: {
            privacyStatus: "public",
          },
        },
        media: {
          body: s3response.data,
        },
      },
      {
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
        _id: taskId,
        "editedVideoUrls._id": videoId,
      },
      {
        $set: {
          "editedVideoUrls.$.uploadedToYoutube": true,
          "editedVideoUrls.$.url": `https://www.youtube.com/watch?v=${response.data.id}`,
        },
      },
      {
        new: true,
      }
    );
    if (!updatedTask) {
      throw new Error("Task or video not found");
    }

    console.log("Video uploaded successfully:", response.data);
    res.status(200).json({
      message: "Video uploaded successfully!",
      videoId: response.data.id,
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
      if (error.response?.status === 401 && organizer.youtubeRefreshToken) {
        const {
          encryptedAccessToken,
          accessToken: newAccessToken,
          expiresIn,
        } = await refreshGoogleAccessToken(organizer.youtubeRefreshToken);

        organizer.youtubeAccessToken = encryptedAccessToken;
        organizer.youtubeTokenExpiry = new Date(Date.now() + expiresIn * 1000);
        await organizer.save();

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
