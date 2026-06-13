const dotenv = require("dotenv");
dotenv.config();
const { Resend }= require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

 async function sendCACRegistrationEmail({ 
  email, 
  fullName, 
  businessName, 
  registrationType
}) {
  const html = `
    <div style="background-color: #f5f7fb; padding: 40px 0; font-family: 'Segoe UI', Roboto, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.08);">
        <div style="background-color: #0046d4; padding: 24px 32px;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">CAC Registration Received 🎉</h1>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            Hi <strong>${fullName}</strong>,
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            Thank you for submitting your <strong>${registrationType}</strong> registration for <strong>${businessName}</strong> through <strong>Fylder.com.ng</strong>. We've successfully received your application and our team is now processing it.
          </p>
          
          <div style="padding: 16px; background-color: #f0f4ff; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 16px; color: #0046d4;">Your Registration Details:</p>
            <div style="margin-top: 12px;">
              <p style="margin: 8px 0; font-size: 14px;"><strong>Business Name:</strong> ${businessName}</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Registration Type:</strong> ${registrationType}</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Submission Date:</strong> ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div style="background-color: #fff8e6; border-left: 4px solid #ffc107; padding: 16px; margin-bottom: 24px;">
            <h3 style="color: #856404; margin: 0 0 8px 0; font-size: 16px;">📋 What Happens Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li style="margin-bottom: 8px;">Our team is reviewing your submitted documents</li>
              <li style="margin-bottom: 8px;">We'll verify all information with CAC requirements</li>
              <li style="margin-bottom: 8px;">You'll receive updates on your application status</li>
              <li>Once completed, you'll get your official CAC documents</li>
            </ul>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            <strong>Processing Time:</strong> Typically takes 3-5 business days. We'll notify you immediately once your registration is completed.
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            If you have any questions or need to provide additional documents, please reply to this email or contact our support team.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://fylder.com.ng/dashboard" 
              style="background-color: #0046d4; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
              View Dashboard
            </a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 32px;">
            <strong>Need Help?</strong><br>
            Email: support@fylder.com.ng<br>
            Phone: +234 (0) XXX-XXXX-XXX<br>
            Website: <a href="https://fylder.com.ng" style="color: #0046d4;">fylder.com.ng</a>
          </p>
        </div>
        <div style="background-color: #f8f9fb; padding: 20px 32px; text-align: center; border-top: 1px solid #eaeaea;">
          <p style="font-size: 13px; color: #999; margin: 0;">
            &copy; ${new Date().getFullYear()} Fylder.com.ng. All rights reserved.<br>
            Making business registration seamless for Nigerian entrepreneurs.
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: `CAC Registration Received - ${businessName}`,
    html,
  });
}

// Utility function to send email (you might already have this)
async function sendEmail({ to, subject, html }) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Fylder <noreply@fylder.com.ng>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Exception sending email:', error);
    return { success: false, error };
  }
}

 async function sendStatusUpdateEmail({
  email,
  fullName,
  businessName,
  registrationType,
  previousStatus,
  newStatus,
  adminNotes
}) {
  
  const statusColors = {
    pending: '#ffc107',
    processing: '#17a2b8',
    completed: '#28a745'
  };

  const statusMessages = {
    pending: 'Pending Review',
    processing: 'Processing',
    completed: 'Completed'
  };

  const html = `
    <div style="background-color: #f5f7fb; padding: 40px 0; font-family: 'Segoe UI', Roboto, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.08);">
        <div style="background-color: #0046d4; padding: 24px 32px;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">CAC Registration Status Updated</h1>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            Hi <strong>${fullName}</strong>,
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            The status of your <strong>${registrationType}</strong> registration for <strong>${businessName}</strong> has been updated.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div>
                <p style="margin: 0; font-size: 14px; color: #666;">Previous Status</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold; color: #333;">${statusMessages[previousStatus]}</p>
              </div>
              <div style="font-size: 20px; color: #666;">→</div>
              <div>
                <p style="margin: 0; font-size: 14px; color: #666;">New Status</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold; color: ${statusColors[newStatus]};">${statusMessages[newStatus]}</p>
              </div>
            </div>
          </div>

          ${adminNotes ? `
            <div style="background-color: #e7f3ff; border-left: 4px solid #0046d4; padding: 16px; margin-bottom: 24px;">
              <h3 style="color: #0046d4; margin: 0 0 8px 0; font-size: 16px;">📝 Admin Notes</h3>
              <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.5;">${adminNotes}</p>
            </div>
          ` : ''}

          ${newStatus === 'completed' ? `
            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 16px; margin-bottom: 24px;">
              <h3 style="color: #155724; margin: 0 0 8px 0; font-size: 16px;"> Registration Completed!</h3>
              <p style="margin: 0; color: #155724; font-size: 14px;">
                Your CAC registration has been completed successfully. Your documents will be available in your dashboard shortly.
              </p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://fylder.com.ng/" 
              style="background-color: #0046d4; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
              View Dashboard
            </a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 32px;">
            <strong>Need Help?</strong><br>
            Email: support@fylder.com.ng<br>
            Website: <a href="https://fylder.com.ng" style="color: #0046d4;">fylder.com.ng</a>
          </p>
        </div>
        <div style="background-color: #f8f9fb; padding: 20px 32px; text-align: center; border-top: 1px solid #eaeaea;">
          <p style="font-size: 13px; color: #999; margin: 0;">
            &copy; ${new Date().getFullYear()} Fylder.com.ng. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: `CAC Registration Status Updated - ${businessName}`,
    html,
  });
}

module.exports = {sendCACRegistrationEmail, sendStatusUpdateEmail}