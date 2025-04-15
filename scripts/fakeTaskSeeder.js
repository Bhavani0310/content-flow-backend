const mongoose = require("mongoose");
require("dotenv").config();
const Task = require("../Models/TasksModel");

const ORGANIZER_ID = "67fd2b2d5a65aa6b43c2c31f";

const ASSIGNEES = {
  "Ananya Sharma": "67fdda79e54250acd6b182c8",
  "Ravi Kumar": "67fdda79e54250acd6b182c9",
  "Priya Mehta": "67fdda79e54250acd6b182ca",
};

const fakeTasks = [
  {
    taskName: "Edit Product Launch Video",
    organizerId: ORGANIZER_ID,
    editorId: ASSIGNEES["Ananya Sharma"],
    rawVideoUrl: ["https://s3.fakecdn.com/raw/product-launch.mp4"],
    editedVideoUrls: [],
    taskDetails: "Focus on smooth transitions and highlight USPs.",
    taskStatus: "in_progress",
    priority: "High",
    deadline: new Date("2024-04-20"),
  },
  {
    taskName: "Create YouTube Shorts",
    organizerId: ORGANIZER_ID,
    editorId: ASSIGNEES["Ravi Kumar"],
    rawVideoUrl: ["https://s3.fakecdn.com/raw/shorts-compilation.mp4"],
    editedVideoUrls: [],
    taskDetails: "Cut clips to 30s max. Include catchy intro text.",
    taskStatus: "assigned",
    priority: "Medium",
    deadline: new Date("2024-04-22"),
  },
  {
    taskName: "Review LinkedIn Carousel Draft",
    organizerId: ORGANIZER_ID,
    editorId: ASSIGNEES["Priya Mehta"],
    rawVideoUrl: [],
    editedVideoUrls: [],
    taskDetails: "Ensure branding is consistent on all slides.",
    taskStatus: "in_progress",
    priority: "Low",
    deadline: new Date("2024-04-25"),
  },
  {
    taskName: "Finalize Founder Interview Clip",
    organizerId: ORGANIZER_ID,
    editorId: ASSIGNEES["Ananya Sharma"],
    rawVideoUrl: ["https://s3.fakecdn.com/raw/founder-intv.mp4"],
    editedVideoUrls: [
      {
        url: "https://s3.fakecdn.com/edited/founder-intv-final.mp4",
        uploadedToYoutube: true,
      },
    ],
    taskDetails: "Trim dead space and remove background noise.",
    taskStatus: "completed",
    priority: "High",
    deadline: new Date("2024-04-18"),
  },
];


async function seedTasks() {
  try {
    await mongoose.connect(process.env.DATABSE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Task.deleteMany({ organizerId: ORGANIZER_ID }); // Optional cleanup
    const inserted = await Task.insertMany(fakeTasks);

    console.log(`✅ Inserted ${inserted.length} fake tasks`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Task seeding failed:", err);
    process.exit(1);
  }
}

seedTasks();
