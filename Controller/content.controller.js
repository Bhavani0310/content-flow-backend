const Content = require("../Models/ContentModal");

exports.createContent = async (req, res) => {
  try {
    const content = await Content.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getContentPipeline = async (req, res) => {
  const { userId } = req.params;

  try {
    const posts = await Content.find({ createdBy: userId }).populate("assignedTo", "name");
    console.log(posts)
    const formatted = posts.map((post) => ({
      id: post._id.toString(),
      title: post.title,
      platform: post.platform,
      date: post.scheduledDate ? new Date(post.scheduledDate).toDateString().slice(4) : "Not Scheduled",
      status: post.status,
      assignee: post.assignedTo?.name || "Unassigned",
    }));

    res.json({ success: true, posts: formatted });
  } catch (err) {
    console.error("Error fetching pipeline:", err);
    res.status(500).json({ success: false, message: "Failed to load content pipeline" });
  }
};

// 2. Update content status
exports.updateContentStatus = async (req, res) => {
  const { contentId } = req.params;
  const { newStatus } = req.body;

  try {
    const validStatuses = ["Draft", "Review", "Scheduled", "Published"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updated = await Content.findByIdAndUpdate(
      contentId,
      { status: newStatus },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: "Content not found" });

    res.json({ success: true, message: "Status updated", updated });
  } catch (err) {
    console.error("Error updating content status:", err);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

exports.getAllContent = async (req, res) => {
  try {
    const content = await Content.find().populate("assignedTo createdBy");
    res.status(200).json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getContentById = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id).populate("assignedTo createdBy");
    if (!content) return res.status(404).json({ error: "Not found" });
    res.status(200).json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    await Content.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
