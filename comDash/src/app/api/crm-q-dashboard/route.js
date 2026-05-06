import { NextResponse } from 'next/server';
import { fetchERP } from 'lib/erpBackend';

export async function GET() {
  try {
    const [leadsData, oppsData, customersData, ordersData, eventsData, commsData] = await Promise.all([
      fetchERP('/api/resource/Lead?limit_page_length=0&fields=["name","creation","status","source"]', 'admin'),
      fetchERP('/api/resource/Opportunity?limit_page_length=0&fields=["name","creation","status"]', 'admin'),
      fetchERP('/api/resource/Customer?limit_page_length=0&fields=["name"]', 'admin'),
      fetchERP('/api/resource/Sales Order?limit_page_length=0&fields=["name","creation"]', 'admin'),
      fetchERP('/api/resource/Event?limit_page_length=0&fields=["name","creation"]', 'admin'),
      fetchERP('/api/resource/Communication?limit_page_length=0&filters=[["communication_type","=","Communication"]]&fields=["name","creation","sent_or_received"]', 'admin')
    ]);

    const leads = leadsData.data || [];
    const opps = oppsData.data || [];
    const customers = customersData.data || [];
    const orders = ordersData.data || [];
    const events = eventsData.data || [];
    const comms = commsData.data || [];

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const calculateTrend = (items) => {
        const thisWeekCount = items.filter(i => new Date(i.creation) >= oneWeekAgo).length;
        const lastWeekCount = items.filter(i => new Date(i.creation) >= twoWeeksAgo && new Date(i.creation) < oneWeekAgo).length;
        if (lastWeekCount === 0) return { count: thisWeekCount, percentage: thisWeekCount > 0 ? 100 : 0, trend: 'up' };
        const diff = thisWeekCount - lastWeekCount;
        return { count: thisWeekCount, percentage: Math.round((Math.abs(diff) / lastWeekCount) * 100), trend: diff >= 0 ? 'up' : 'down' };
    };

    // 1. GREETING & KPIs
    const subtitle = `You have ${events.length} meetings and events scheduled.`;
    const greetingData = [
        { icon: 'material-symbols:handshake-outline-rounded', count: calculateTrend(leads).count, label: 'Leads created', percentage: calculateTrend(leads).percentage, trend: calculateTrend(leads).trend },
        { icon: 'material-symbols:payments-outline-rounded', count: calculateTrend(orders).count, label: 'Orders created', percentage: calculateTrend(orders).percentage, trend: calculateTrend(orders).trend }
    ];

    const totalActiveLeads = leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').length;
    const openOpps = opps.filter(o => o.status === 'Open' || o.status === 'Quotation').length;
    const winRate = leads.length > 0 ? Math.round((opps.filter(o => o.status === 'Converted').length / leads.length) * 100) : 0; 

    const kpiData = [
        { id: 1, title: 'Active Leads', value: totalActiveLeads, amount: totalActiveLeads, subtitle: 'Total open leads', icon: { name: 'material-symbols-light:contact-mail-outline-rounded', color: 'primary.main' } },
        { id: 2, title: 'Open Opportunities', value: openOpps, amount: openOpps, subtitle: 'Currently in pipeline', icon: { name: 'material-symbols-light:assignment-outline-rounded', color: 'warning.main' } },
        { id: 3, title: 'Total Customers', value: customers.length, amount: customers.length, subtitle: 'Registered clients', icon: { name: 'material-symbols-light:groups-outline-rounded', color: 'success.main' } },
        { id: 4, title: 'Win Rate', value: `${winRate}%`, amount: `${winRate}%`, subtitle: 'Conversion rate', icon: { name: 'material-symbols-light:military-tech-outline-rounded', color: 'error.main' } }
    ];

    // 2. OPPORTUNITY TRACKER (Grouped Bar Chart - Last 7 Weeks)
    const open = Array(7).fill(0), converted = Array(7).fill(0), lost = Array(7).fill(0);
    const categories = Array(7).fill('');
    
    for (let i = 0; i < 7; i++) {
        const weekStart = new Date(now.getTime() - (6 - i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - (6 - i) * 7 * 24 * 60 * 60 * 1000);
        categories[i] = `W${i + 1}`; // Week labels

        opps.forEach(o => {
            const d = new Date(o.creation);
            if (d >= weekStart && d < weekEnd) {
                if (o.status === 'Lost') lost[i]++;
                else if (o.status === 'Converted' || o.status === 'Won') converted[i]++;
                else open[i]++;
            }
        });
    }
    const oppTrackerData = { categories, open, converted, lost };

    // 3. COMMUNICATION FLOW (Positive/Negative Chart - Last 13 Months)
    const received = Array(13).fill(0), sent = Array(13).fill(0), meetings = Array(13).fill(0);
    comms.forEach(c => {
       const d = new Date(c.creation);
       const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
       if (diffMonths >= 0 && diffMonths < 13) {
           const idx = 12 - diffMonths;
           if (c.sent_or_received === 'Received') received[idx]++;
           else if (c.sent_or_received === 'Sent') sent[idx] -= 1; // Negative for chart
       }
    });
    events.forEach(e => {
       const d = new Date(e.creation);
       const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
       if (diffMonths >= 0 && diffMonths < 13) meetings[12 - diffMonths]++;
    });
    const commFlowData = { received, sent, meetings };

    // 4. LEAD SOURCES (Dynamic Pie Chart)
    const sourceMap = {};
    leads.forEach(l => {
        const src = l.source || 'Direct';
        sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const leadSourcesData = Object.keys(sourceMap).map(k => ({ value: sourceMap[k], name: k })).sort((a,b) => b.value - a.value);
    if (leadSourcesData.length === 0) leadSourcesData.push({ value: 0, name: 'No Data' });

    return NextResponse.json({ greetingData, kpiData, subtitle, oppTrackerData, commFlowData, leadSourcesData });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}