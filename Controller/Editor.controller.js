require("dotenv").config();
const User = require("../Models/UsersModel");
const jwtToken = require("../Models/jwt-token.model");
const bcrypt = require("bcryptjs");
const { signToken } = require("../helpers/jwt.helper");
const commonConstant = require("../constants/common.constant");
const HttpStatusConstant = require("../constants/http-message.constant");
const HttpStatusCode = require("../constants/http-code.constant");
const ResponseMessageConstant = require("../constants/response-message.constant");
const CommonConstant = require("../constants/common.constant");
const ErrorLogConstant = require("../constants/error-log.constant");
const TaskModel = require("../Models/TasksModel");
const sendEmail = require("../config/nodemailer");

const imageController = require("./image.controller");
const Org = require("../Models/OrganizerModel");
const { default: mongoose } = require("mongoose");

//editor API'S

exports.handleImageupload = async (req, res) => {
  try {
    console.log("file", req.file);

    const userId = req.user.id; // Assuming the user ID is sent in the request body
    console.log(userId);
    const file = req.file;
    const imageUrl = await imageController.uploadImageToS3(
      file.originalname,
      file,
      userId
    );
    await User.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $set: {
          profileImageUrl: imageUrl,
        },
      }
    );

    // Update the user's profileImageUrl in the database
    await User.findByIdAndUpdate(userId, { profileImageUrl: imageUrl });

    // Send the S3 URL back to the frontend
    console.log("response is sending to frontend");
    res.status(200).json({ imageUrl });
  } catch (error) {}
};

exports.handleTextChange = async (req, res) => {
  try {
    console.log("handle text change triggered");
    const { newText } = req.body;
    console.log(newText);
    console.log(req.body);
    const userId = req.user.id;
    console.log("this is user id", userId);
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
      },
      {
        $set: {
          description: newText,
        },
      }
    );
    console.log(user);
    console.log("description updated");
    return res.status(200).json({ text: newText });
  } catch (err) {
    return res.status(500).json({ error: err });
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

// exports.handleGetAllOrganizers = async (req, res) => {
//   try {
//     console.log("handling all organizer details");
//     const userId = req.user.id;

//     // Fetch the current user (Editor)
//     const CurrentEditor = await User.findOne({ _id: userId });
//     // console.log("is current editor",CurrentEditor);

//     // If the editor is already working with another organizer
//     if (CurrentEditor?.organizerId) {
//       return res.status(200).json({ message: "Working with other Organizer" });
//     }

//     // Extract search query from request (default to empty string if not provided)

//     const searchQuery = req.query.search || "";

//     // Create a filter for the query
//     console.log("searchquery is ",searchQuery);
//     const filter = searchQuery
//       ? { name: { $regex: searchQuery, $options: "i" } } // Case-insensitive partial match
//       : {};

//     // Fetch organizers based on the filter and include only 'name' and 'youtubeChannelName'
//     const organizers = await Org.find(filter, "_id name youtubeChannelName");
//     //add a column to the organizers say "orgStatus"
//     organizers.map((org)=>{
//     const existingRequest = CurrentEditor.organizerRequestStatus.find(
//       (request) => request.organizerId.toString() === org._id
//     );
//     if(existingRequest===true)
//     {
//       // keep orgStatus as true
//       org.orgStatus=true;
//     }
//   }
//   )

//     return res.status(200).json({ organizers });
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };
exports.handleGetAllOrganizers = async (req, res) => {
  try {
    console.log("Fetching all organizer details");
    const userId = req.user.id;
    console.log("req.user in all org", req.user);

    // Fetch the current user (Editor)
    const currentEditor = await User.findById(userId);
    if (currentEditor === null) {
      return res.status(404).json({ message: "Editor not found" });
    }

    // If the editor is already associated with another organizer
    if (currentEditor.organizerId) {
      return res
        .status(200)
        .json({ message: "Working with another Organizer" });
    }

    // Extract search query (default to empty string if not provided)
    const searchQuery = req.query.search || "";

    // Create filter for organizers based on the search query
    const filter = searchQuery
      ? { name: { $regex: searchQuery, $options: "i" } } // Case-insensitive partial match
      : {};

    // Fetch organizers and add `orgStatus` dynamically
    const organizers = await Org.find(filter, "_id name youtubeChannelName");
    const organizersWithStatus = organizers.map((org) => {
      const existingRequest = currentEditor.organizerRequestStatus.some(
        (request) => request.organizerId.toString() === org._id.toString()
      );

      return {
        ...org.toObject(), // Convert Mongoose document to plain object
        orgStatus: existingRequest, // Set `orgStatus` to true or false
      };
    });

    return res.status(200).json({ organizers: organizersWithStatus });
  } catch (err) {
    console.error("Error fetching organizer details:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// exports.handleRequestToOrg = async (req, res) => {
//   try {
//     console.log("handling all organizer details");
//     const userId = req.user.id;

//     // Fetch the current user (Editor)
//     const CurrentEditor = await User.findOne({ _id: userId });
//     const {organizerId}=req.body;
//     const orgDetail= await Org.findOne({id:organizerId});
//     if(orgDetail===null) return res.status(404).json({ message: "Organizer notfound" });
//     //insert into pending editors  in org model

//     //insert into organizerRequestStatus in users model

//     return res.status(200).json({ organizers });
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };
exports.handleRequestToOrg = async (req, res) => {
  try {
    console.log("Handling organizer details request");

    const userId = req.user.id; // Fetching the editor's ID from the request
    const { organizerId } = req.body; // Organizer ID from the request body
    console.log(organizerId);
    // Fetch the current user (Editor)
    const currentEditor = await User.findById(userId);
    if (currentEditor === null) {
      return res.status(404).json({ message: "Editor not found" });
    }
    console.log("editor found");

    // Fetch the organizer's details
    const orgDetail = await Org.findById(organizerId);
    if (orgDetail === null) {
      console.log("org not found");
      return res.status(404).json({ message: "Organizer not found" });
    }
    console.log(orgDetail);

    // Check if the editor has already sent a request to this organizer
    const existingRequest = currentEditor.organizerRequestStatus.find(
      (request) => request.organizerId.toString() === organizerId
    );

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Request already sent to this organizer" });
    }

    // Add the request to the organizer's `pendingEditors` list
    orgDetail.pendingEditors.push({
      editorId: currentEditor._id,
      status: "pending",
    });
    await orgDetail.save();

    // Add the request to the editor's `organizerRequestStatus` array
    currentEditor.organizerRequestStatus.push({
      status: "pending",
      organizerId: orgDetail._id,
    });
    await currentEditor.save();

    // Return a success response
    return res
      .status(200)
      .json({ message: "Request sent to organizer", orgDetail });
  } catch (err) {
    console.error("Error handling organizer details request:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

exports.handleGetAllTasks = async (req, res) => {
  try {
    const editorId = req.user.id; // Fetching the editor's ID from the request
    if (!mongoose.isValidObjectId(editorId)) {
      return res.status(400).json({ error: "Invalid Editor ID" });
    }

    // Fetch tasks and populate organizerId with name
    const tasks = await TaskModel.find({ editorId }).populate(
      "organizerId",
      "name"
    );
    console.log("Tasks are", tasks);

    if (!tasks.length) {
      return res
        .status(404)
        .json({ message: "No tasks found for this editor" });
    }

    const now = new Date();
    const categorizedTasks = {
      Active: [],
      Pending: [],
      Completed: [],
    };

    // Categorize tasks
    tasks.forEach((task) => {
      const taskInfo = {
        id: task._id,
        name: task.taskName,
        organizer: task.organizerId?.name || "Unknown", // Handle missing organizer
        deadline: task.deadline,
      };

      switch (task.taskStatus) {
        case "completed":
          categorizedTasks.Completed.push(taskInfo);
          break;
        case "in_progress":
          if (task.deadline && now > task.deadline) {
            categorizedTasks.Pending.push(taskInfo);
          } else {
            categorizedTasks.Active.push(taskInfo);
          }
          break;
        default:
          console.warn(`Unexpected task status: ${task.taskStatus}`);
          break;
      }
    });

    return res.status(200).json(categorizedTasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.handleGetTaskDetail = async (req, res) => {
  try {
    const { taskId } = req.body;
    const taskdetails = await TaskModel.findById(taskId)
      .populate("organizerId", "name") // Populate editor's name only
      .select("taskName deadline taskStatus rawVideoUrl editedVideoUrls");

    if (!taskdetails) {
      return res.status(404).json({ message: "Task not found" });
    }

     // Format the response
     const response = {
      taskName: taskdetails.taskName,
      editorName: taskdetails.editorId?.name || 'N/A', // If editorId is null
      deadline: taskdetails.deadline,
      taskStatus: taskdetails.taskStatus,
      rawUrls: taskdetails.rawVideoUrl,
      editedUrls: taskdetails.editedVideoUrls,
    };

    return res.status(200).json(response);

  } catch (err) {
    console.error("Error fetching tasks:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.handleUpdateEditedVideos = async (req,res)=>
{
  try{
    console.log(req.body.taskId);
    console.log(req);
    const taskId=req.body.taskId;
    const editorId=req.user.id;
    const description=req.body.description;

    const files = req.files;
    console.log(files);

    if (!taskId || !files || files.length === 0) {
      return res.status(400).json({ error: "Task ID and files are required" });
    }

    // Upload videos to S3 and collect URLs
    const uploadedUrls = [];
    for (const file of files) {
      const uploadedUrl = await imageController.uploadVideoToS3(file.originalname, file, taskId);
      if (!uploadedUrl) {
        return res.status(500).json({ error: "Failed to upload video to S3" });
      }
      uploadedUrls.push(uploadedUrl);
    }
    console.log("uploaded to s3");

    // Assuming uploadedUrls is an array of strings (URLs)
const formattedUrls = uploadedUrls.map((url) => ({
  url: url,
  uploadedToYoutube: false, // Default value for the new field
}));

    // Update the raw video URLs in the task document
    const task = await TaskModel.findByIdAndUpdate(
      taskId,
      { $push: { editedVideoUrls: { $each: formattedUrls } }, updatedAt: new Date() },
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
    const organizer=await Org.findById(task.organizerId);
    if(organizer===null)
    {
      return res.status(404).json({ error: "Organizer not found" });
    }

    await sendEmail({
      to: organizer.email,
      subject: `New edited Videos Added: ${task.taskName}`,
      text: `Hello ${organizer.name},\n\nNew Edited video files have been uploaded for the task "${
        task.taskName
      } by the editor ${editor.name} ".\n\nDescription: ${description}\n\nYou can download the Edited video files here:\n${uploadedUrls.join(
        "\n"
      )}\n\nDeadline: ${
        task.deadline ? task.deadline.toDateString() : "No deadline specified"
      }\n\nBest regards,\nYour team`,
      html: `<p>Hello ${editor.name},</p>
             <p>New edited video files have been uploaded for the task "<strong>${
               task.taskName
             }</strong>".</p>
             <p><strong>Description:</strong> ${description}</p>
             <p>You can download the edited video files here:</p>
             <ul>${uploadedUrls.map((url) => `<li><a href="${url}">${url}</a></li>`).join("")}</ul>
             <p><strong>Deadline:</strong> ${
               task.deadline ? task.deadline.toDateString() : "No deadline specified"
             }</p>
             <p>Best regards,<br/>Your Team</p>`,
    });

    return res.status(200).json({
      message: "Videos uploaded and organizer notified",
      uploadedUrls,
    });

  }
  catch(err){
    console.error("Error fetching tasks:", err);
    return res.status(500).json({ error: err.message });
  }
}

// exports.handleTaskStatusChange = async (req,res)=>{
//   try{

//     const taskId=req.body.taskId;
//     const newStatus = req.body.newStatus;
    
//     const description=req.body.description;

//     const files = req.files;
//     console.log(files);

//     if (!taskId || !files || files.length === 0) {
//       return res.status(400).json({ error: "Task ID and files are required" });
//     }


//   }
//   catch(err)
//   {
//     console.error("Error status change", err);
//     return res.status(500).json({ error: err.message });
//   }
// }