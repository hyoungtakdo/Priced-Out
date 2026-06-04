const csvFile = "wa_housing.csv";

const margin = { top: 45, right: 160, bottom: 95, left: 105 };
const tooltip = d3.select("#tooltip");

const formatDollar = d3.format("$,.0f");
const formatPercent = d3.format(".1f");

d3.csv(csvFile).then(data => {
  const dateColumns = data.columns.filter(col => /^\d{4}-\d{2}-\d{2}$/.test(col));

  const counties = data
    .filter(d => d.State === "WA" && d.RegionType === "county")
    .map(d => {
      const values = dateColumns
        .map(date => ({
          date: new Date(date),
          value: +d[date]
        }))
        .filter(d => !isNaN(d.value));

      const value2010 = values.find(v => v.date.getFullYear() === 2010)?.value;

      return {
        county: d.RegionName,
        metro: d.Metro,
        values: values,
        firstValue: values[0].value,
        value2010: value2010,
        latestValue: values[values.length - 1].value,
        growthPercent: ((values[values.length - 1].value - values[0].value) / values[0].value) * 100,
        growthSince2010: value2010
          ? ((values[values.length - 1].value - value2010) / value2010) * 100
          : null
      };
    })
    .filter(d => d.value2010);

  const color = d3.scaleOrdinal()
    .domain(counties.map(d => d.county))
    .range(d3.schemeTableau10.concat(d3.schemeSet3, d3.schemePaired));

  drawLineChart(counties, color);
  drawBarChart(counties, color);
  drawComparisonChart(counties, color);
});

function moveTooltip(event) {
  tooltip
    .style("left", event.clientX + 15 + "px")
    .style("top", event.clientY + 15 + "px");
}

function drawLineChart(counties, color) {
  const container = d3.select("#line-chart");
  container.html("");

  const width = container.node().clientWidth - margin.left - margin.right;
  const height = 460 - margin.top - margin.bottom;

  const selectedCounties = [...counties]
    .sort((a, b) => d3.descending(a.latestValue, b.latestValue))
    .slice(0, 8);

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime()
    .domain(d3.extent(selectedCounties[0].values, d => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(selectedCounties, county => d3.max(county.values, d => d.value))])
    .nice()
    .range([height, 0]);

  chart.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(8));

  chart.append("g")
    .call(d3.axisLeft(y).tickFormat(d3.format("$,.0f")));

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

  chart.selectAll(".county-line")
    .data(selectedCounties)
    .enter()
    .append("path")
    .attr("class", "county-line")
    .attr("fill", "none")
    .attr("stroke", d => color(d.county))
    .attr("stroke-width", 3)
    .attr("d", d => line(d.values))
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke-width", 6);

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d.county}</strong><br>
          Latest value: ${formatDollar(d.latestValue)}<br>
          Growth since 2010: ${formatPercent(d.growthSince2010)}%
        `);

      moveTooltip(event);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function() {
      d3.select(this).attr("stroke-width", 3);
      tooltip.style("opacity", 0);
    });

  chart.append("text")
    .attr("x", width / 2)
    .attr("y", height + 55)
    .attr("text-anchor", "middle")
    .text("Year");

  chart.append("text")
    .attr("x", -height / 2)
    .attr("y", -70)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Zillow home value");

  chart.append("text")
    .attr("x", 0)
    .attr("y", -18)
    .attr("class", "chart-title")
    .text("Top 8 Washington Counties by Latest Home Value");
}

function drawBarChart(counties, color) {
  const container = d3.select("#bar-chart");
  container.html("");

  const width = container.node().clientWidth - margin.left - margin.right;
  const height = 460 - margin.top - margin.bottom;

  const topCounties = [...counties]
    .sort((a, b) => d3.descending(a.latestValue, b.latestValue))
    .slice(0, 10);

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(topCounties, d => d.latestValue)])
    .nice()
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(topCounties.map(d => d.county))
    .range([0, height])
    .padding(0.22);

  chart.append("g")
    .call(d3.axisLeft(y));

  chart.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("$,.0f")));

  chart.selectAll("rect")
    .data(topCounties)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", d => y(d.county))
    .attr("width", d => x(d.latestValue))
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.county))
    .on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.7);

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d.county}</strong><br>
          Latest value: ${formatDollar(d.latestValue)}<br>
          Growth since 2010: ${formatPercent(d.growthSince2010)}%
        `);

      moveTooltip(event);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      tooltip.style("opacity", 0);
    });

  chart.selectAll(".bar-label")
    .data(topCounties)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.latestValue) + 6)
    .attr("y", d => y(d.county) + y.bandwidth() / 2 + 4)
    .text(d => formatDollar(d.latestValue));

  chart.append("text")
    .attr("x", width / 2)
    .attr("y", height + 55)
    .attr("text-anchor", "middle")
    .text("Most recent Zillow home value");

  chart.append("text")
    .attr("x", 0)
    .attr("y", -18)
    .attr("class", "chart-title")
    .text("Top 10 Most Expensive Washington Counties");
}

function drawComparisonChart(counties, color) {
  const container = d3.select("#scatter-chart");
  container.html("");

  const width = container.node().clientWidth - margin.left - margin.right;
  const height = 520 - margin.top - margin.bottom;

  const selectedCounties = [...counties]
    .sort((a, b) => d3.descending(a.latestValue, b.latestValue))
    .slice(0, 8);

  const comparisonData = [];

  selectedCounties.forEach(d => {
    comparisonData.push({
      county: d.county,
      period: "2010",
      value: d.value2010
    });

    comparisonData.push({
      county: d.county,
      period: "Latest",
      value: d.latestValue
    });
  });

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom + 45);

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(comparisonData, d => d.value)])
    .nice()
    .range([0, width]);

  const yCounty = d3.scaleBand()
    .domain(selectedCounties.map(d => d.county))
    .range([0, height])
    .padding(0.18);

  const yPeriod = d3.scaleBand()
    .domain(["2010", "Latest"])
    .range([0, yCounty.bandwidth()])
    .padding(0.12);

  chart.append("g")
    .call(d3.axisLeft(yCounty));

  chart.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("$,.0f")));

  chart.selectAll(".comparison-bar")
    .data(comparisonData)
    .enter()
    .append("rect")
    .attr("class", "comparison-bar")
    .attr("x", 0)
    .attr("y", d => yCounty(d.county) + yPeriod(d.period))
    .attr("width", d => x(d.value))
    .attr("height", yPeriod.bandwidth())
    .attr("fill", d => color(d.county))
    .attr("opacity", d => d.period === "2010" ? 0.35 : 1)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke", "#111").attr("stroke-width", 2);

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d.county}</strong><br>
          ${d.period} value: ${formatDollar(d.value)}
        `);

      moveTooltip(event);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function() {
      d3.select(this).attr("stroke", "none");
      tooltip.style("opacity", 0);
    });

  chart.selectAll(".comparison-label")
    .data(comparisonData.filter(d => d.period === "Latest"))
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.value) + 6)
    .attr("y", d => yCounty(d.county) + yPeriod(d.period) + yPeriod.bandwidth() / 2 + 4)
    .text(d => formatDollar(d.value));

  chart.append("text")
    .attr("x", width / 2)
    .attr("y", height + 65)
    .attr("text-anchor", "middle")
    .text("Zillow home value");

  chart.append("text")
    .attr("x", 0)
    .attr("y", -18)
    .attr("class", "chart-title")
    .text("How Much More Expensive Homes Are Now Compared With 2010");

  const periodLegend = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${height + margin.top + 85})`);

  periodLegend.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", "#555")
    .attr("opacity", 0.35);

  periodLegend.append("text")
    .attr("x", 22)
    .attr("y", 12)
    .text("2010")
    .style("font-size", "12px");

  periodLegend.append("rect")
    .attr("x", 80)
    .attr("y", 0)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", "#555")
    .attr("opacity", 1);

  periodLegend.append("text")
    .attr("x", 102)
    .attr("y", 12)
    .text("Latest")
    .style("font-size", "12px");
}