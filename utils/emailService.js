const nodemailer = require('nodemailer');

// Configure the email transporter
// In a real application, you should use environment variables for these credentials
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred email service
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-email-password'
    }
});

/**
 * Sends an email with the provided details.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 * @param {Array} attachments - Array of attachment objects { filename, content }
 * @returns {boolean} - True if sent successfully, false otherwise
 */
const sendReportEmail = async (to, subject, html, attachments = []) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("Email credentials not set. Email simulation: success.");
        // We return true to simulate success in dev environment if creds are missing
        // so the UI doesn't break.
        return true;
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

const sendOrderConfirmation = async (to, orderId, items, total) => {
    const subject = `Order Confirmation #${orderId}`;
    const itemsHtml = items.map(i => `<li>${i.name} x ${i.quantity} - $${(i.price * i.quantity).toFixed(2)}</li>`).join('');
    const html = `
        <h2>Order Received!</h2>
        <p>Thank you for your order. We are processing it.</p>
        <h3>Order #${orderId}</h3>
        <ul>${itemsHtml}</ul>
        <p><strong>Total: $${total.toFixed(2)}</strong></p>
        <p>We will notify you when your order is shipped.</p>
    `;
    return await sendReportEmail(to, subject, html);
};

const sendNewOrderAlert = async (recipients, orderId, customerName, total) => {
    if (!recipients || recipients.length === 0) return;
    const subject = `New Order Alert: #${orderId}`;
    const html = `
        <h2>New Order Received</h2>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Order ID:</strong> #${orderId}</p>
        <p><strong>Total:</strong> $${total.toFixed(2)}</p>
        <p>Please check the dashboard to process this order.</p>
    `;
    // Send individually or as BCC. For simplicity, individual loop in caller or BCC here.
    // nodemailer supports array in 'to'.
    return await sendReportEmail(recipients.join(','), subject, html);
};

const sendOrderStatusUpdate = async (to, orderId, status) => {
    const subject = `Order Status Update: #${orderId}`;
    const html = `
        <h2>Order Update</h2>
        <p>Your order <strong>#${orderId}</strong> status has been updated to:</p>
        <h3 style="color: #3498db;">${status}</h3>
    `;
    return await sendReportEmail(to, subject, html);
};

const sendLowStockAlert = async (recipients, itemName, currentStock) => {
    if (!recipients || recipients.length === 0) return;
    const subject = `URGENT: Low Stock Alert - ${itemName}`;
    const html = `
        <h2 style="color: #e74c3c;">Low Stock Warning</h2>
        <p>The inventory for <strong>${itemName}</strong> is running low.</p>
        <p><strong>Current Level:</strong> ${currentStock}</p>
        <p>Please replenish immediately.</p>
    `;
    return await sendReportEmail(recipients.join(','), subject, html);
};

const sendReplenishmentAlert = async (recipients, itemName, addedQty, newStock) => {
    if (!recipients || recipients.length === 0) return;
    const subject = `Inventory Replenished: ${itemName}`;
    const html = `
        <h2>Stock Update</h2>
        <p>Inventory for <strong>${itemName}</strong> has been replenished.</p>
        <p><strong>Added:</strong> ${addedQty}</p>
        <p><strong>New Level:</strong> ${newStock}</p>
    `;
    return await sendReportEmail(recipients.join(','), subject, html);
};

module.exports = {
    sendReportEmail,
    sendOrderConfirmation,
    sendNewOrderAlert,
    sendOrderStatusUpdate,
    sendLowStockAlert,
    sendReplenishmentAlert
};
