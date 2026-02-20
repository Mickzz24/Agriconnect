// public/js/reports.js

// Make available globally
window.sendReport = async function (action = 'email') {
    const reportType = document.getElementById('reportType').value;
    const reportDate = document.getElementById('reportDate').value;
    const statusMsg = document.getElementById('report-status-msg');

    if (!reportDate) {
        alert("Please select a date.");
        return;
    }

    if (statusMsg) {
        statusMsg.innerText = action === 'email' ? "Generating and sending email..." : `Generating ${action.toUpperCase()}...`;
        statusMsg.className = "text-info";
        statusMsg.style.color = "#3498db";
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert("Authentication lost. Please login again.");
        return;
    }

    try {
        const payload = {
            reportType: reportType,
            selectedDate: reportDate,
            format: 'csv' // Always fetch data as CSV/JSON source
        };

        if (action !== 'email') {
            payload.action = 'download';
        }

        const response = await fetch('/api/reports/email-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            if (action === 'email') {
                if (statusMsg) {
                    statusMsg.innerText = `Success: ${data.message}`;
                    statusMsg.style.color = "#27ae60";
                }
            } else if (action === 'excel') {
                // Download CSV
                const blob = new Blob([data.fileContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.filename || `Report_${reportDate}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                if (statusMsg) {
                    statusMsg.innerText = "Success: Report downloaded as CSV/Excel.";
                    statusMsg.style.color = "#27ae60";
                }
            } else if (action === 'pdf') {
                // Generate PDF Client Side
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                doc.setFontSize(18);
                doc.text(`AgriConnect - ${reportType} Report`, 14, 22);
                doc.setFontSize(11);
                doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
                doc.text(`Period: ${reportDate}`, 14, 36);

                // Prepare table data
                const tableColumn = ["ID", "Customer", "Date", "Status", "Amount"];
                const tableRows = [];

                if (data.data && Array.isArray(data.data)) {
                    data.data.forEach(order => {
                        const orderData = [
                            order.id,
                            order.customer,
                            new Date(order.date).toLocaleDateString(),
                            order.status,
                            '$' + parseFloat(order.amount).toFixed(2)
                        ];
                        tableRows.push(orderData);
                    });
                }

                // Add Summary Row
                if (data.summary) {
                    tableRows.push(["", "TOTAL", "", "", '$' + parseFloat(data.summary.totalRevenue).toFixed(2)]);
                }

                doc.autoTable({
                    head: [tableColumn],
                    body: tableRows,
                    startY: 44,
                });

                doc.save(`Report_${reportType}_${reportDate}.pdf`);

                if (statusMsg) {
                    statusMsg.innerText = "Success: Report downloaded as PDF.";
                    statusMsg.style.color = "#27ae60";
                }
            }
        } else {
            throw new Error(data.message || "Failed to generate report");
        }

    } catch (err) {
        console.error("Error processing report:", err);
        if (statusMsg) {
            statusMsg.innerText = `Error: ${err.message}`;
            statusMsg.style.color = "#e74c3c";
        }
    }
}

