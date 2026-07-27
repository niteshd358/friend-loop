import nodemailer from "nodemailer";

// Using Ethereal Email for testing (fake SMTP service)
// In production, replace with real SMTP (e.g., SendGrid, Mailgun, Gmail App Password)
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Generate test SMTP service account from ethereal.email if no credentials are provided
    const user = process.env.SMTP_USER || "test_user@ethereal.email";
    const pass = process.env.SMTP_PASS || "test_password";
    
    let transporter;
    
    // If no real SMTP is provided in env, let's auto-create an Ethereal account
    if (!process.env.SMTP_USER) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, 
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    const info = await transporter.sendMail({
      from: '"Chat App" <noreply@chatapp.com>', 
      to, 
      subject, 
      text, 
      html, 
    });

    console.log("Message sent: %s", info.messageId);
    
    if (!process.env.SMTP_USER) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error("Error sending email: ", error);
    return false;
  }
};
