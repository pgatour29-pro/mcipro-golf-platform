/**
 * ANALYTICS EXPORT & REPORTING
 *
 * Export comprehensive analytics reports in multiple formats:
 * - PDF (formatted report with charts)
 * - Excel (spreadsheet with all data)
 * - CSV (raw data export)
 * - Email/Share (send to stakeholders)
 */

const AnalyticsExport = {

    // Generate comprehensive analytics data
    generateReportData() {
        const financial = GMAnalytics.calculateFinancialHealth();
        const operational = GMAnalytics.calculateOperationalEfficiency();
        const customer = GMAnalytics.calculateCustomerExperience();
        const accounting = GMAnalytics.calculateAccountingMetrics();
        const eodData = AnalyticsDrillDown.calculateEndOfDay();
        const { bookings, orders } = GMAnalytics.getData();
        const today = new Date().toISOString().split('T')[0];

        // Get all transactions
        const todayBookings = bookings.filter(b => b.date === today);
        const todayOrders = orders.filter(o => o.date === today);

        return {
            reportDate: new Date().toLocaleString(),
            courseName: 'Golf Course', // TODO: Get from course config
            financial,
            operational,
            customer,
            accounting,
            eodData,
            bookings: todayBookings,
            orders: todayOrders
        };
    },

    // Export as PDF
    exportPDF() {
        const data = this.generateReportData();

        // Create printable HTML
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Analytics Report - ${data.reportDate}</title>
                <style>
                    @media print {
                        @page { margin: 1cm; }
                        body { margin: 0; }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #1a1a1a;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        margin: 0;
                        color: #1a1a1a;
                    }
                    .header p {
                        margin: 5px 0;
                        color: #666;
                    }
                    .section {
                        margin: 20px 0;
                        page-break-inside: avoid;
                    }
                    .section h2 {
                        color: #1a1a1a;
                        border-bottom: 2px solid #e0e0e0;
                        padding-bottom: 5px;
                        margin-bottom: 15px;
                    }
                    .metric-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                        margin: 15px 0;
                    }
                    .metric-card {
                        border: 1px solid #e0e0e0;
                        padding: 15px;
                        border-radius: 8px;
                    }
                    .metric-label {
                        font-size: 12px;
                        color: #666;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                    }
                    .metric-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #1a1a1a;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 10px 0;
                    }
                    th {
                        background: #f5f5f5;
                        padding: 10px;
                        text-align: left;
                        border-bottom: 2px solid #ddd;
                        font-size: 12px;
                    }
                    td {
                        padding: 8px 10px;
                        border-bottom: 1px solid #eee;
                        font-size: 13px;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        color: #999;
                        font-size: 12px;
                        border-top: 1px solid #e0e0e0;
                        padding-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${data.courseName} - Analytics Report</h1>
                    <p>Generated: ${data.reportDate}</p>
                </div>

                <!-- Financial Health -->
                <div class="section">
                    <h2>Financial Health</h2>
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-label">Revenue Now</div>
                            <div class="metric-value">฿${data.financial.totalRevenue.toLocaleString()}</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Forecast (EoD)</div>
                            <div class="metric-value">฿${Math.round(data.financial.forecast).toLocaleString()}</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Revenue / Round</div>
                            <div class="metric-value">฿${Math.round(data.financial.revenuePerRound).toLocaleString()}</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Utilization</div>
                            <div class="metric-value">${Math.round(data.financial.utilization)}%</div>
                        </div>
                    </div>
                </div>

                <!-- Revenue by Source -->
                <div class="section">
                    <h2>Revenue by Source</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Source</th>
                                <th>Revenue</th>
                                <th>Count</th>
                                <th>% of Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Green Fees</td>
                                <td>฿${data.financial.greenFees.toLocaleString()}</td>
                                <td>${data.bookings.length} rounds</td>
                                <td>${((data.financial.greenFees / data.financial.totalRevenue) * 100).toFixed(1)}%</td>
                            </tr>
                            <tr>
                                <td>Caddy Services</td>
                                <td>฿${data.financial.caddyFees.toLocaleString()}</td>
                                <td>${data.bookings.filter(b => b.caddyId).length} caddies</td>
                                <td>${((data.financial.caddyFees / data.financial.totalRevenue) * 100).toFixed(1)}%</td>
                            </tr>
                            <tr>
                                <td>F&B Sales</td>
                                <td>฿${data.financial.fnbRevenue.toLocaleString()}</td>
                                <td>${data.orders.filter(o => o.category === 'food' || o.category === 'beverage').length} orders</td>
                                <td>${((data.financial.fnbRevenue / data.financial.totalRevenue) * 100).toFixed(1)}%</td>
                            </tr>
                            <tr>
                                <td>Pro Shop</td>
                                <td>฿${data.financial.proShopRevenue.toLocaleString()}</td>
                                <td>${data.orders.filter(o => o.category === 'proshop').length} sales</td>
                                <td>${((data.financial.proShopRevenue / data.financial.totalRevenue) * 100).toFixed(1)}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Operational Efficiency -->
                <div class="section">
                    <h2>Operational Efficiency</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Time Period</th>
                                <th>Utilization</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Peak Hours (8AM-2PM)</td>
                                <td>${Math.round(data.operational.peakUtilization)}%</td>
                                <td>${data.operational.peakUtilization > 80 ? 'High Demand' : data.operational.peakUtilization > 50 ? 'Moderate' : 'Low'}</td>
                            </tr>
                            <tr>
                                <td>Midday (2PM-5PM)</td>
                                <td>${Math.round(data.operational.midUtilization)}%</td>
                                <td>${data.operational.midUtilization > 80 ? 'High Demand' : data.operational.midUtilization > 50 ? 'Moderate' : 'Low'}</td>
                            </tr>
                            <tr>
                                <td>Evening (5PM-7PM)</td>
                                <td>${Math.round(data.operational.eveningUtilization)}%</td>
                                <td>${data.operational.eveningUtilization > 80 ? 'High Demand' : data.operational.eveningUtilization > 50 ? 'Moderate' : 'Low'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Cash Reconciliation -->
                <div class="section">
                    <h2>Cash Reconciliation</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Location</th>
                                <th>Starting Cash</th>
                                <th>Revenue Added</th>
                                <th>Expected Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(data.eodData.registers).map(register => `
                                <tr>
                                    <td>${register.charAt(0).toUpperCase() + register.slice(1)}</td>
                                    <td>฿${data.eodData.registers[register].startingCash.toLocaleString()}</td>
                                    <td>฿${Math.round((data.eodData.expectedCash[register] || 0) - data.eodData.registers[register].startingCash).toLocaleString()}</td>
                                    <td>฿${Math.round(data.eodData.expectedCash[register] || 0).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                            <tr style="font-weight: bold; background: #f5f5f5;">
                                <td>TOTAL</td>
                                <td>฿${data.eodData.totalStartingCash.toLocaleString()}</td>
                                <td>฿${data.eodData.totalRevenue.toLocaleString()}</td>
                                <td>฿${Math.round(data.eodData.totalExpected).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="footer">
                    <p>MCI Pro Golf Platform - Analytics Report</p>
                    <p>This report is confidential and for internal use only</p>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();

        // Wait for content to load, then print
        setTimeout(() => {
            printWindow.print();
        }, 500);
    },

    // Export as Excel (CSV format - can be opened in Excel)
    exportExcel() {
        const data = this.generateReportData();

        // Create CSV content
        let csv = 'ANALYTICS REPORT\n';
        csv += `Generated: ${data.reportDate}\n\n`;

        // Financial Summary
        csv += 'FINANCIAL SUMMARY\n';
        csv += 'Metric,Value\n';
        csv += `Revenue Now,${data.financial.totalRevenue}\n`;
        csv += `Forecast (EoD),${Math.round(data.financial.forecast)}\n`;
        csv += `Revenue per Round,${Math.round(data.financial.revenuePerRound)}\n`;
        csv += `Utilization,${Math.round(data.financial.utilization)}%\n`;
        csv += `Rounds Today,${data.bookings.length}\n\n`;

        // Revenue by Source
        csv += 'REVENUE BY SOURCE\n';
        csv += 'Source,Revenue,Count,Percentage\n';
        csv += `Green Fees,${data.financial.greenFees},${data.bookings.length},${((data.financial.greenFees / data.financial.totalRevenue) * 100).toFixed(1)}%\n`;
        csv += `Caddy Services,${data.financial.caddyFees},${data.bookings.filter(b => b.caddyId).length},${((data.financial.caddyFees / data.financial.totalRevenue) * 100).toFixed(1)}%\n`;
        csv += `F&B Sales,${data.financial.fnbRevenue},${data.orders.filter(o => o.category === 'food' || o.category === 'beverage').length},${((data.financial.fnbRevenue / data.financial.totalRevenue) * 100).toFixed(1)}%\n`;
        csv += `Pro Shop,${data.financial.proShopRevenue},${data.orders.filter(o => o.category === 'proshop').length},${((data.financial.proShopRevenue / data.financial.totalRevenue) * 100).toFixed(1)}%\n\n`;

        // Bookings Detail
        csv += 'BOOKINGS DETAIL\n';
        csv += 'Time,Player,Green Fee,Caddy Fee,Customer Type\n';
        data.bookings.forEach(b => {
            csv += `${b.time},${b.playerName || 'Walk-in'},${b.greenFee || 2000},${b.caddyId ? 500 : 0},${b.customerType || 'walkin'}\n`;
        });
        csv += '\n';

        // Orders Detail
        csv += 'ORDERS DETAIL\n';
        csv += 'Time,Customer,Category,Amount,Payment Method\n';
        data.orders.forEach(o => {
            csv += `${o.time || 'N/A'},${o.customerName || 'Guest'},${o.category},${o.totalAmount || 0},${o.paymentMethod || 'cash'}\n`;
        });
        csv += '\n';

        // Cash Reconciliation
        csv += 'CASH RECONCILIATION\n';
        csv += 'Location,Starting Cash,Revenue Added,Expected Total\n';
        Object.keys(data.eodData.registers).forEach(register => {
            csv += `${register},${data.eodData.registers[register].startingCash},${Math.round((data.eodData.expectedCash[register] || 0) - data.eodData.registers[register].startingCash)},${Math.round(data.eodData.expectedCash[register] || 0)}\n`;
        });
        csv += `TOTAL,${data.eodData.totalStartingCash},${data.eodData.totalRevenue},${Math.round(data.eodData.totalExpected)}\n`;

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Export as JSON (raw data)
    exportJSON() {
        const data = this.generateReportData();

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `Analytics_Report_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Show export options modal
    showExportOptions() {
        const modal = `
            <div id="export-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                 onclick="if(event.target.id === 'export-modal') this.remove()">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
                        <h3 class="text-lg font-bold text-white">Export Analytics Report</h3>
                        <button onclick="document.getElementById('export-modal').remove()"
                                class="text-white hover:text-gray-200">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="p-6 space-y-3">
                        <button onclick="AnalyticsExport.exportPDF(); document.getElementById('export-modal').remove();"
                                class="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition">
                            <span class="material-symbols-outlined text-red-600">picture_as_pdf</span>
                            <div class="text-left flex-1">
                                <div class="font-semibold text-gray-900">Export as PDF</div>
                                <div class="text-xs text-gray-600">Formatted report for printing/sharing</div>
                            </div>
                        </button>

                        <button onclick="AnalyticsExport.exportExcel(); document.getElementById('export-modal').remove();"
                                class="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition">
                            <span class="material-symbols-outlined text-green-600">table_chart</span>
                            <div class="text-left flex-1">
                                <div class="font-semibold text-gray-900">Export as Excel/CSV</div>
                                <div class="text-xs text-gray-600">Spreadsheet with all data</div>
                            </div>
                        </button>

                        <button onclick="AnalyticsExport.exportJSON(); document.getElementById('export-modal').remove();"
                                class="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition">
                            <span class="material-symbols-outlined text-blue-600">code</span>
                            <div class="text-left flex-1">
                                <div class="font-semibold text-gray-900">Export as JSON</div>
                                <div class="text-xs text-gray-600">Raw data for integrations</div>
                            </div>
                        </button>

                        <button onclick="AnalyticsExport.shareReport(); document.getElementById('export-modal').remove();"
                                class="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition">
                            <span class="material-symbols-outlined text-purple-600">share</span>
                            <div class="text-left flex-1">
                                <div class="font-semibold text-gray-900">Share Report</div>
                                <div class="text-xs text-gray-600">Email or copy link</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);
    },

    // Share report
    shareReport() {
        const data = this.generateReportData();

        // Create shareable summary
        const summary = `
📊 ANALYTICS REPORT
${data.courseName}
Generated: ${data.reportDate}

💰 REVENUE NOW: ฿${data.financial.totalRevenue.toLocaleString()}
📈 FORECAST (EoD): ฿${Math.round(data.financial.forecast).toLocaleString()}
⛳ REVENUE/ROUND: ฿${Math.round(data.financial.revenuePerRound).toLocaleString()}
📊 UTILIZATION: ${Math.round(data.financial.utilization)}%

REVENUE BREAKDOWN:
🏌️ Green Fees: ฿${data.financial.greenFees.toLocaleString()}
👤 Caddy Services: ฿${data.financial.caddyFees.toLocaleString()}
🍽️ F&B Sales: ฿${data.financial.fnbRevenue.toLocaleString()}
🛍️ Pro Shop: ฿${data.financial.proShopRevenue.toLocaleString()}

CASH RECONCILIATION:
💵 Starting Cash: ฿${data.eodData.totalStartingCash.toLocaleString()}
💰 Revenue Added: ฿${data.eodData.totalRevenue.toLocaleString()}
✅ Expected Total: ฿${Math.round(data.eodData.totalExpected).toLocaleString()}
        `.trim();

        // Copy to clipboard
        navigator.clipboard.writeText(summary).then(() => {
            alert('Report summary copied to clipboard! You can now paste it in email, LINE, or any messaging app.');
        }).catch(() => {
            // Fallback: show in modal
            const modal = `
                <div id="share-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                     onclick="if(event.target.id === 'share-modal') this.remove()">
                    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div class="bg-blue-600 px-6 py-4 flex items-center justify-between">
                            <h3 class="text-lg font-bold text-white">Share Report</h3>
                            <button onclick="document.getElementById('share-modal').remove()"
                                    class="text-white hover:text-gray-200">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div class="p-6">
                            <textarea id="report-text" class="w-full h-96 p-4 border rounded font-mono text-sm" readonly>${summary}</textarea>
                            <button onclick="document.getElementById('report-text').select(); document.execCommand('copy');"
                                    class="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modal);
        });
    }
};

// Export for global access
window.AnalyticsExport = AnalyticsExport;

// Replace the old exportAnalyticsPDF function
window.exportAnalyticsPDF = function() {
    AnalyticsExport.showExportOptions();
};
