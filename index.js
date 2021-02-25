import React from "react";
import ReactDOM from "react-dom";
import * as d3 from "d3";
import * as topojson from "topojson";
import "./index.css";

window.onload = async () => {
  const eduUrl = "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json";
  const countyUrl = "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json";

  const dataEdu = await fetch(eduUrl);
  const dataEduJson = await dataEdu.json();

  const dataCounty = await fetch(countyUrl);
  const dataCountyJson = await dataCounty.json();

  init(dataEduJson, dataCountyJson);
}

const init = (dataEdu, dataCounty) => {

  const App = () => {
  
    return (
      <div>
        <h1 id="title">United States Educational Attainment<br/>
          <span id="description">
            Percentage of adults age 25 and older with a bachelor's degree or higher (2010-2014)
          </span>
        </h1>
        <div id="choroplethWrapper">
          <div id="choropleth">
          </div>
        </div>
      </div>
    );
  }
  
  ReactDOM.render(<App/>, document.getElementById("root"));

  const svg = d3
                .select("#choropleth")
                .append("svg")
                .attr("viewBox", [0, 0, 975, 610]);

  const counties = topojson.feature(dataCounty, dataCounty.objects.counties).features;
  
  const data = ((arrObj1, arrObj2) => { // arrObj --> array of Objects
    const arr1 = [...arrObj1];
    const arr2 = [...arrObj2];
    const wrapper = [];
    for (let i in arrObj1) {
      wrapper.push({county: arr1[i], edu: arr2[i]})
    }
    return wrapper;
  })(counties, dataEdu);

  const colors = [...d3.schemeGreens[9]];
  colors.shift();
  colors.pop();

  const bacOrHi = dataEdu.map(o=>o.bachelorsOrHigher);// bachelorsOrHigher array
  const min = Math.min.apply(null, bacOrHi);
  const max = Math.max.apply(null, bacOrHi);

  const thresholds = ((min, max, count)=>{
    const thresholds = [];
    const step = (max-min)/count;
    const base = min;
    
    for (let i=1; i<count; i++) {
      thresholds.push(base+step*i);
    }
    return thresholds;
  })(min, max, colors.length);

  const thresholdScale = d3.scaleThreshold().domain(thresholds).range(colors);

  const handleMouseOver = (e, d) => {
    const message = `${d.edu.area_name}, ${d.edu.state}: ${d.edu.bachelorsOrHigher}%`;
    
    d3.select("#choropleth")
      .append("div")
      .attr("id", "tooltip")
      .attr("data-education", d.edu.bachelorsOrHigher)
      .style("position", "absolute")
      .style("left", e.layerX+5)
      .style("top", e.layerY+5)
      .html(`<span>${message}</span>`);
  }

  const handleMouseOut = () => {
    d3.select("#tooltip").remove();
  }

  const path = d3.geoPath();
  svg
    .append("g")
    .selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr("class", "county")
    .attr("d", d=>path(d.county))
    .attr("fill", d=>thresholdScale(d.edu.bachelorsOrHigher))
    .attr("data-fips", d=>d.edu.fips)
    .attr("data-education", d=>d.edu.bachelorsOrHigher)
    .on("mouseover", handleMouseOver)
    .on("mouseout", handleMouseOut);


  svg.append("path")
    .datum(topojson.mesh(dataCounty, dataCounty.objects.states, function(a, b) { return a !== b; }))
    .attr("class", "states")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#fff")
    .attr("stroke-width", "2px")

  const lW= 400, lH=100;  
  const legendXScale = d3
                        .scaleLinear()
                        .domain([min, max])
                        .range([30, lW-30]);
                          
  const legendAxis=d3
                    .axisBottom(legendXScale)
                    .tickValues(thresholdScale.domain())
                    .tickFormat(d=>d3.format(".0%")(d/100))
                    .tickSize(13);

  const gLegend = svg
                    .append("g")
                    .attr("width", lW)
                    .attr("height", lH)
                    .attr("id", "legend")
                    .attr("transform", `translate(${975/2}, -52)`)
                    .call(legendAxis);

  gLegend.select(".domain").remove();

  gLegend
      .selectAll("rect")
      .data(thresholdScale.range().map(color => {
        const delim = thresholdScale.invertExtent(color);
        if(!delim[0]) delim[0]=legendXScale.domain()[0];
        if(!delim[1]) delim[1]=legendXScale.domain()[1];
        return delim;
      }))
      .enter()
      .insert("rect", ".tick")
      .attr("height", 13)
      .attr("x", d=>legendXScale(d[0]))
      .attr("width", d=>legendXScale(d[1])-legendXScale(d[0]))
      .attr("fill", d=>thresholdScale(d[0]));
}