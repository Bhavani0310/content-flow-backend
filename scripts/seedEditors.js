const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../Models/UsersModel");
const Org = require("../Models/OrganizerModel");

const ORG_ID = "67fd2b2d5a65aa6b43c2c31f";

const editors = [
  {
    name: "Ananya Sharma",
    email: "ananya@example.com",
    password: "hashedpassword1", // Consider hashing if needed.
    role: "editor",
    organizerId: ORG_ID,
  },
  {
    name: "Ravi Kumar",
    email: "ravi@example.com",
    password: "hashedpassword2",
    role: "editor",
    organizerId: ORG_ID,
  },
  {
    name: "Priya Mehta",
    email: "priya@example.com",
    password: "hashedpassword3",
    role: "editor",
    organizerId: ORG_ID,
  },
];

async function seedEditors() {
  try {
    await mongoose.connect(process.env.DATABSE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Insert editor documents.
    const inserted = await User.insertMany(editors);
    console.log("✅ Editors inserted:");
    inserted.forEach((e) => console.log(`${e.name}: "${e._id}"`));

    // Update the organization model's editorIds field with the newly inserted editors' IDs.
    const editorIds = inserted.map((editor) => editor._id);
    const updatedOrg = await Org.findByIdAndUpdate(
      ORG_ID,
      { editorIds },
      { new: true }
    );
    console.log("✅ Organization updated with editorIds:", updatedOrg.editorIds);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error inserting editors:", error);
    process.exit(1);
  }
}

seedEditors();
