const mongoose = require("mongoose");
require("dotenv").config();

const Content = require("../Models/ContentModal");

const ORGANIZER_ID = "67fd2b2d5a65aa6b43c2c31f"; // replace with actual ObjectId
const ASSIGNEES = {
    "Ananya Sharma": "67fdda79e54250acd6b182c8",
    "Ravi Kumar": "67fdda79e54250acd6b182c9",
    "Priya Mehta": "67fdda79e54250acd6b182ca",
};
  
const fakeContent = [
    {
      title: "Product Launch Campaign",
      platform: "LinkedIn",
      status: "Draft",
      scheduledDate: new Date("2024-04-25"),
      tags: ["launch", "product"],
      createdBy: ORGANIZER_ID,
      assignedTo: ASSIGNEES["Ananya Sharma"],
    },
    {
      title: "Founder's Interview Snippet",
      platform: "YouTube",
      status: "Review",
      scheduledDate: new Date("2024-04-27"),
      tags: ["interview", "video"],
      createdBy: ORGANIZER_ID,
      assignedTo: ASSIGNEES["Ravi Kumar"],
    },
    {
      title: "Hiring Announcement",
      platform: "LinkedIn",
      status: "Scheduled",
      scheduledDate: new Date("2024-04-28"),
      tags: ["hiring", "announcement"],
      createdBy: ORGANIZER_ID,
      assignedTo: ASSIGNEES["Priya Mehta"],
    },
    {
      title: "Behind The Scenes",
      platform: "YouTube",
      status: "Published",
      scheduledDate: new Date("2024-04-22"),
      tags: ["bts", "reel"],
      createdBy: ORGANIZER_ID,
      assignedTo: ASSIGNEES["Ananya Sharma"],
    },
  ];
  


async function seedFakeContent() {
  try {
    await mongoose.connect(process.env.DATABSE_URL, { useNewUrlParser: true, useUnifiedTopology: true });

    await Content.deleteMany({ createdBy: ORGANIZER_ID }); // Clear previous seed
    const inserted = await Content.insertMany(fakeContent);

    console.log(`✅ Inserted ${inserted.length} fake content posts.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding content:", error);
    process.exit(1);
  }
}

seedFakeContent();
