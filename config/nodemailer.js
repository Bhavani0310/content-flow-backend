const nodemailer = require("nodemailer");

const sendMail = async ({ to, subject, text, html }) => {
  try {
    // Configure the transporter
    const transporter = nodemailer.createTransport({
      service: "gmail", // Use "gmail", "yahoo", "outlook", etc., or SMTP config
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    });

    // Define the email options
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender address
      to, // Recipient address
      subject, // Email subject
      text, // Plain text content
      html, // HTML content (optional)
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.messageId);

    return info;
  } catch (error) {
    console.error("Error sending email: ", error.message);
    throw error;
  }
};

module.exports = sendMail;
