export function generateFunnelData(rawLeads) {
    // 1. Define the "Happy Path" order of your funnel
    const funnelStages = ["New", "Interested", "Opportunity", "Quotation", "Converted"];

    // Colors matching your ECharts theme logic
    const stageColors = ['#1976d2', '#42a5f5', '#64b5f6', '#90caf9', '#4caf50'];

    // 2. Count how many leads are in each status
    const counts = {
        New: 0, Interested: 0, Opportunity: 0, Quotation: 0, Converted: 0,
        // You can also track lost leads for your table
        "Lost Quotation": 0, "Do Not Contact": 0
    };

    rawLeads.forEach(lead => {
        if (counts[lead.status] !== undefined) {
            counts[lead.status]++;
        }
    });

    // 3. Format data for SaleFunnelChart.jsx
    // It expects an object like: { New: 100, Interested: 75, ... }
    const chartData = {};
    funnelStages.forEach(stage => {
        chartData[stage] = counts[stage];
    });

    // 4. Format data for SaleFunnelTable.jsx
    // It expects an array of objects
    const tableData = funnelStages.map((stage, index) => {
        // Example math: Calculate what % this stage makes up of the total funnel
        const totalActive = funnelStages.reduce((sum, s) => sum + counts[s], 0);
        const thisMonthPercentage = totalActive > 0 ? Math.round((counts[stage] / totalActive) * 100) : 0;

        // Example math: Calculate drop-off/lost leads (custom logic based on your needs)
        const lostPercentage = stage === 'Quotation' && totalActive > 0
            ? Math.round((counts["Lost Quotation"] / totalActive) * 100)
            : 0;

        return {
            stage: stage,
            lostLead: lostPercentage,
            thisMonth: thisMonthPercentage, // or just pass the raw count: counts[stage]
            stageIndicator: stageColors[index]
        };
    });

    return { chartData, tableData };
}