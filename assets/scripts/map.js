import { bills } from '/assets/data/bills.js';

google.charts.load('current', { packages: ['geochart'] });
google.charts.setOnLoadCallback(drawRegionsMap);

function drawRegionsMap() {
  const stateCounts = {};
  bills.forEach(bill => {
    stateCounts[bill.state] = (stateCounts[bill.state] || 0) + 1;
  });

  // Prepare data for GeoChart
  const dataArray = [['State', 'HasBill', { role: 'tooltip' }]];
  for (const [state, count] of Object.entries(stateCounts)) {
    const billText = count === 1 ? '1 bill impacted' : `${count} bills impacted`;
    dataArray.push([state, 1, billText]);
  }

  const data = google.visualization.arrayToDataTable(dataArray);

  const options = {
    region: 'US',
    displayMode: 'regions',
    resolution: 'provinces',
    backgroundColor: 'transparent',
    defaultColor: '#f8f9fa',
    datalessRegionColor: '#f8f9fa',
    colorAxis: {
      values: [0, 1],
      colors: ['#f8f9fa', '#003049'], // light → Bootstrap navy
    },
    tooltip: {
      isHtml: false,
      textStyle: {
        fontName: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }
    },
    legend: 'none',
  };

  const chartDiv = document.getElementById('regions_div');
  const chart = new google.visualization.GeoChart(chartDiv);
  chart.draw(data, options);

  // Change cursor to pointer on hover only for states with bills
  google.visualization.events.addListener(chart, 'regionMouseOver', (event) => {
    const hoveredRegion = event.region;
    const hasBills = Object.keys(stateCounts).some(state => getStateCode(state) === hoveredRegion);
    chartDiv.style.cursor = hasBills ? 'pointer' : 'default';
  });

  google.visualization.events.addListener(chart, 'regionMouseOut', () => {
    chartDiv.style.cursor = 'default';
  });

  // Click on state redirects to bills page with search query
  google.visualization.events.addListener(chart, 'regionClick', (event) => {
    const clickedRegion = event.region;
    const matchedState = Object.keys(stateCounts).find(state => getStateCode(state) === clickedRegion);
    if (matchedState) {
      const encodedState = encodeURIComponent(matchedState);
      window.location.href = `/bills.html?search=${encodedState}`;
    }
  });
}

function getStateCode(stateName) {
  const map = {
    'Alabama': 'US-AL', 'Alaska': 'US-AK', 'Arizona': 'US-AZ', 'Arkansas': 'US-AR',
    'California': 'US-CA', 'Colorado': 'US-CO', 'Connecticut': 'US-CT', 'Delaware': 'US-DE',
    'Florida': 'US-FL', 'Georgia': 'US-GA', 'Hawaii': 'US-HI', 'Idaho': 'US-ID',
    'Illinois': 'US-IL', 'Indiana': 'US-IN', 'Iowa': 'US-IA', 'Kansas': 'US-KS',
    'Kentucky': 'US-KY', 'Louisiana': 'US-LA', 'Maine': 'US-ME', 'Maryland': 'US-MD',
    'Massachusetts': 'US-MA', 'Michigan': 'US-MI', 'Minnesota': 'US-MN', 'Mississippi': 'US-MS',
    'Missouri': 'US-MO', 'Montana': 'US-MT', 'Nebraska': 'US-NE', 'Nevada': 'US-NV',
    'New Hampshire': 'US-NH', 'New Jersey': 'US-NJ', 'New Mexico': 'US-NM', 'New York': 'US-NY',
    'North Carolina': 'US-NC', 'North Dakota': 'US-ND', 'Ohio': 'US-OH', 'Oklahoma': 'US-OK',
    'Oregon': 'US-OR', 'Pennsylvania': 'US-PA', 'Rhode Island': 'US-RI', 'South Carolina': 'US-SC',
    'South Dakota': 'US-SD', 'Tennessee': 'US-TN', 'Texas': 'US-TX', 'Utah': 'US-UT',
    'Vermont': 'US-VT', 'Virginia': 'US-VA', 'Washington': 'US-WA', 'West Virginia': 'US-WV',
    'Wisconsin': 'US-WI', 'Wyoming': 'US-WY', 'District of Columbia': 'US-DC'
  };
  return map[stateName];
}

window.addEventListener('resize', drawRegionsMap);
