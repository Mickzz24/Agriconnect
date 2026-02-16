const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'agriconnect.alerts@gmail.com', // Replace with real one or use env var
        pass: process.env.EMAIL_PASS || 'your_app_password' // Replace with real one or use env var
    }
});

if (!process.env.EMAIL_USER) {
    console.warn("⚠️ Email service not configured. Set EMAIL_USER and EMAIL_PASS environment variables to send real emails.");
}

const sendLowStockAlert = async (product, ownerEmail) => {
    const mailOptions = {
        from: 'agriconnect.alerts@gmail.com',
        to: ownerEmail,
        subject: `🚨 Low Stock Alert: ${product.item_name}`,
        html: `
            <h3>Low Stock Warning</h3>
            <p>The following item has fallen below its minimum threshold:</p>
            <ul>
                <li><strong>Product:</strong> ${product.item_name}</li>
                <li><strong>Current Quantity:</strong> ${product.quantity} ${product.unit}</li>
                <li><strong>Minimum Threshold:</strong> ${product.threshold}</li>
            </ul>
            <p>Please restock immediately to avoid shortages.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email alert sent for ${product.item_name}`);
    } catch (error) {
        console.error('Error sending email alert:', error);
    }
};

const sendReportEmail = async (to, subject, html, attachments) => {
    const mailOptions = {
        from: 'agriconnect.alerts@gmail.com',
        to: to,
        subject: subject,
        html: html,
        attachments: attachments // Array of { filename, content }
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Report email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Error sending report email:', error);
        return false;
    }
};

module.exports = { sendLowStockAlert, sendReportEmail };
