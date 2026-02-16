# Email Report Feature - Setup Guide

## 📧 What Was Implemented

I've successfully added an **Email Report** feature to the Accountant Dashboard that allows sending financial reports (CSV format) directly to the owner's email address.

## ✨ Features Added

### 1. **Backend API Endpoint** (`routes/reports.js`)
   - **Endpoint**: `POST /api/reports/email-report`
   - **Authentication**: Required (uses JWT token)
   - **Capabilities**:
     - Accepts `reportType` (Daily/Weekly/Monthly/PL/Expense)
     - Accepts `format` (csv)
     - Accepts `selectedDate` for date range calculation
     - Fetches all owners from database
     - Generates CSV report with order data
     - Emails the report to all owner accounts

### 2. **Email Service** (`utils/emailService.js`)
   - Added `sendReportEmail()` function
   - Supports email attachments (CSV files)
   - Professional HTML email templates
   - Includes report summary in email body

### 3. **Frontend UI** (`accountant.html` & `accountant.js`)
   - **Email Buttons**: Added orange envelope buttons (📧) next to PDF/CSV buttons
   - **Reports Supported**:
     - Daily Sales Report (with email)
     - Weekly Sales Report (with email)
     - Monthly Sales Report (with email)
   - **UX Flow**:
     1. User selects a date
     2. Clicks the email button (📧)
     3. Confirms sending
     4. System emails report to all owners

### 4. **Invoice Feature** (Bonus)
   - Added "Invoice" button to expense actions for both Owner and Accountant
   - Generates professional PDF vouchers for expense records

## 🔧 Configuration Required

### **Email Credentials** (Required for Production)

The email service uses **Nodemailer with Gmail**. To enable email sending:

1. **Create a Gmail App Password**:
   - Go to Google Account Settings → Security
   - Enable 2-Factor Authentication
   - Generate an "App Password" for "Mail"

2. **Set Environment Variables**:
   ```bash
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

3. **Or update** `utils/emailService.js`:
   ```javascript
   auth: {
       user: 'your-email@gmail.com',
       pass: 'your-app-password'
   }
   ```

### **Owner Email Setup**

Ensure owners in your database have valid email addresses:

```sql
UPDATE Users SET email = 'owner@example.com' WHERE role = 'owner';
```

## 🎯 How It Works

1. **Accountant** navigates to **Reports** section
2. Selects a date using the date picker
3. Clicks the **📧 Email** button for desired report type
4. System:
   - Validates date selection
   - Fetches orders for the selected period
   - Generates CSV report
   - Queries database for all owner accounts
   - Sends professional email with CSV attachment to each owner
5. Confirmation alert shows number of emails sent

## 📋 Email Template

The email includes:
- **Subject**: `AgriConnect: [Report Type] Report`
- **Body**: 
  - Professional greeting
  - Report period information
  - Summary (Total Orders, Total Revenue)
  - CSV attachment
  - Professional signature

## 🚀 Testing

1. **Set up email credentials** (see Configuration above)
2. **Ensure at least one owner exists** in the database with a valid email
3. **Navigate to Accountant Dashboard** → Reports
4. **Select a date** with existing order data
5. **Click the 📧 button** for any report type
6. **Check owner's email** for the report

## ⚠️ Current Limitations

1. **PDF Email**: Currently only CSV format is supported for email. PDF generation on the server-side would require additional libraries (e.g., `puppeteer` or server-side jsPDF).
2. **Email Configuration**: Requires Gmail account or SMTP server configuration.

## 🔐 Security Notes

- Email endpoint is protected with JWT authentication
- Only authenticated accountants can send reports
- Reports are sent only to verified owner accounts
- No sensitive authentication data is exposed in emails
