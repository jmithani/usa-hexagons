/*
  Jasmine Mithani and Tasnim Rahman
  CMSC 239 Data Visualization
  Project 2

  Sources:
  for understanding lerping in d3
  https://github.com/d3/d3/wiki/Transitions#d3_interpolate

  for understanding colors in d3
  https://github.com/d3/d3/wiki/Colors

  for changing the text of labels
  https://piazza.com/class/imd8a11rfa72ux?cid=191

  for understanding the coloring of bivariate maps
  https://piazza.com/class/imd8a11rfa72ux?cid=184

  clarifying process for bivariate votes
  https://piazza.com/class/imd8a11rfa72ux?cid=165

  for understanding quantile
  https://github.com/d3/d3/wiki/Quantitative-Scales

  People:
  Jasmine and Ariel Jackson helped each other through InfantMortality, and UnivariateVotes colormaps.
  Amanda Aizuss helped clarify pulling out the chroma in UnivariateVotes.
  Jasmine helped Elliot Levy with the concept of lerping, and how to modularize the project (i.e. make 
    functions for each map).
*/


function dataFinish(data) {

  // Adding PL, VT, VA columns to our data set
  data.forEach(function(d) {
    d.PL = +d.ObamaVotes / (1 + (+d.ObamaVotes) + (+d.RomneyVotes));
    d.VT = +d.ObamaVotes + +d.RomneyVotes;
  });

  var arrVB = data.map(function(d) { return d.VT; });
  var maxVB = d3.max(arrVB);

  // pre calculating the VN value for the bivariate votes map
  data.forEach(function(d) {
    var VN = d3.min([1, d.VT/maxVB]);
    d.VA = 1 - Math.pow(1-VN, 3);
  });

}

function choiceSet(wat) {

  //getting the data bound to the usmap
  // http://stackoverflow.com/questions/16057485/d3-js-get-an-array-of-the-data-attached-to-a-selection
  var data = d3.select("#mapUS").selectAll("g")
      .data();

  // switching based off of the wat to call the appropriate function to handle the radio selction
  switch(wat){
    case 'OB':
      setObesity(data);
      break;

    case 'UN':
      setUnemployment(data);
      break;

    case 'IM':
      setInfantMortality(data);
      break;

    case 'VU':
      setVotesUnivariate(data);
      break;

    case 'VB':
      setVotesBivariate(data);
      break;

    case 'ES':
      setEarningsSymmetric(data);
      break;

    case 'ER':
      setEarningsRecentered(data);
      break;
  }

}

function setObesity(data){
  /* radio button text "Obesity (univariate)" / radio button value "OB" / .csv column "Obesity": Consider a 
  * path P(x) in RGB space which is linearly interpolated from rgb(100,200,100) for the lowest obesity value,
  * to rgb(220,220,210) at the value 40% of the way from lowest to highest, to rgb(130,0,0) at the highest 
  * obesity value.  The colormap uses just 7 colors sampled from P(x), each color covering 1/7 of the range 
  * in the value being colormapped: P(1/14), P(3/14), P(5/14), ... P(13/14).  This roughly approximates the 
  * obesity colormap considered in HW2.  Tickmarks should show the Obesity values.
  */

  // getting all of the obesity values for each state in one array 
  var arrOB = data.map(function(d) { return +d.Obesity; });

  // calling the function to generate the colormap function for OB with the data parsed out
  var colormap = colormapOB(arrOB);

  // selecting and updating the state path elements with the colormap function to select a new fill color
  var states = d3.select("#mapUS").selectAll("path")
      .data(arrOB)
    .style("fill", colormap);

  // getting the canvas size and copied code from index.html to select the canvas and create
  // a new canvas image data to replace the old canvas data with
  var CmapLegSize = window.CmapLegSize; 
  var canvas = document.querySelector("canvas");
  var cmlContext = canvas.getContext("2d");
  var cmlImage = cmlContext.createImageData(CmapLegSize, CmapLegSize);

  // getting the max and min for lerping btwn the canvas coordinates and the OB colormap function domain
  var maxOB = d3.max(arrOB);
  var minOB = d3.min(arrOB);

  // creating the lerp function for going between canvas coords and the colormap function domain
  var canvasScl = d3.scale.linear()
    .domain([0, CmapLegSize])
    .range([minOB, maxOB]);

  // copied code from index.html to modify new canvas data with the colormap fn for OB
  for (var j=0, k=0; j < CmapLegSize; ++j) {
      for (var i=0; i < CmapLegSize; ++i) {
          // using the lerp to go between canvas coords, and the colormap fn domain and then getting the 
          // color by passing to the colormap function and converting to rgb
          var c = d3.rgb(colormap(canvasScl(i)));
          cmlImage.data[k++] = c.r;
          cmlImage.data[k++] = c.g;
          cmlImage.data[k++] = c.b;
          cmlImage.data[k++] = 255;
      }
  }
  // display cmlImage inside canvas
  cmlContext.putImageData(cmlImage, 0, 0);

  // creating lerp fn to go between the colormap fn domain and the canvas coords (unlerp of canvasScl)
  var tScl = d3.scale.linear()
    .domain([minOB, maxOB])
    .range([0, CmapLegSize]);

  // selecting all of the ticks and updating the x coordinates of the top and bottom of the tick line
  // it's univariate so they can both use the same function
  d3.select("#cmlTicks").selectAll("line")
      .data(arrOB)
    .attr("x1", function(d) {return tScl(d);} ) 
    .attr("x2", function(d) {return tScl(d);} ); 

  // disabling the circles just in case
  d3.select("#cmlCircs").attr("display", "none");

  // enabling the ticks
  d3.select("#cmlTicks").attr("display", null);

  // setting the canvas axis information by selecting the element with d3 and updating the html
  d3.select("#xminlabel").html("<text>" + minOB + "</text>");
  d3.select("#xmaxlabel").html("<text>" + maxOB + "</text>");
  d3.select("#yminlabel").html("<text>" + "</text>");
  d3.select("#ymaxlabel").html("<text>" + "</text>");
}

function colormapOB(data){
  // precalulating max/min bc they'll be used for generating the color lerp functions later
  var maxOB = d3.max(data);
  var minOB = d3.min(data);
  var diffOB = maxOB - minOB;

  // visually the control point will be at 3/7 because it is the first fraction of 7 that exceeds
  // the control point of 40%
  var partition = 3/7;

  // creating the rgb values for the beginning and ending from the specs
  var startRgb = d3.rgb(100, 200, 100);
  var endRgb = d3.rgb(130, 0, 0);

  // Because we were given the control point at .4 for the overall colormap lerp, we're using lerp to 
  // calculate what the rgb color would be at 3/7 
  var partitionRgb = rgbLerp(startRgb, d3.rgb(220, 220, 210), partition/.4);

  // generating the color interpolator function for the first 3/7 of the overall colormap
  var greenI = d3.interpolateRgb(startRgb, partitionRgb);

  // using the green color interpolator function and quantile lerp to map equal partitions of a linear domain 
  // into 3 discrete colors. the colors are generated through using the previously created green color 
  // interpolator evaluated at the midpoints of each third. 
  var greenColor = d3.scale.quantile()
    .domain([0, 3/7])
    .range([greenI(1/6), greenI(1/2), greenI(5/6)]);

  // generating the colormap for the latter 4/7 of the partition map
  var redI = d3.interpolateRgb(partitionRgb, endRgb);

  // repeating the same as we did for the green colormap above, except we are evaulting the midpoints of each
  // fourth. 
  var redColor = d3.scale.quantile()
          .domain([3/7, 1])
          .range([redI(1/8), redI(3/8), redI(5/8), redI(7/8)]);

  // returning the colormapping function that takes in an obesity value
  var ret = function(d) {
    // calculating where the data fractionally falls in the range between the max and min
    var v = (+d - minOB) / diffOB;
    var color;

    // if the data fraction falls in the first 3/7, then we pass it to the greenColor mapping fn, if not
    // we pass it to the red and return the color the color interpolater gives us
    if (v <= partition){
      color = greenColor(v);
    } else {
      color = redColor(v);
    }
    return color; 
  };

  return ret;
}

function setUnemployment(data){

  /* "Unemployment (univariate)" / "UN" / "Unemployment": Colors should be linearly interpolated between four 
  * equally-space control points, defined in terms of x varies from 0 to 1: rgb(0,0,0) at x=0, rgb(230,0,0) at 
  * x=1/3, rgb(255,230,0) at x=2/3, and  rgb(255,255,255) at x=1.  x=0 at the lowest unemployment value, linearly 
  * ramping to x=1 at the highest unemployment value. This approximates the "black body" colormap.  Tickmarks 
  * should show the Unemployment values.
  */

  var arrUN = data.map(function(d) { return +d.Unemployment; });

  // calling the function to generate the colormap function for UN with the data parsed out
  var colormap = colormapUN(arrUN);

  // selecting and updating the state path elements with the colormap function to select a new fill color
  var states = d3.select("#mapUS").selectAll("path")
      .data(arrUN)
    .style("fill", colormap);

  // getting the canvas size and copied code from index.html to select the canvas and create
  // a new canvas image data to replace the old canvas data with
  var CmapLegSize = window.CmapLegSize; 
  var canvas = document.querySelector("canvas");
  canvas.width = CmapLegSize;
  canvas.height = CmapLegSize;
  var cmlContext = canvas.getContext("2d");
  var cmlImage = cmlContext.createImageData(CmapLegSize, CmapLegSize);

  // getting the max and min for lerping btwn the canvas coordinates and the UN colormap function domain
  var maxUN = d3.max(arrUN);
  var minUN = d3.min(arrUN);

  // creating the lerp function for going between canvas coords and the colormap function domain
  var canvasScl = d3.scale.linear()
    .domain([0, CmapLegSize])
    .range([minUN, maxUN]);

  // copied code from index.html to modify new canvas data with the colormap fn for UN
  for (var j=0, k=0; j < CmapLegSize; ++j) {
      for (var i=0; i < CmapLegSize; ++i) {
        // using the lerp to go between canvas coords, and the colormap fn domain and then getting the 
        // color by passing to the colormap function and converting to rgb
        var c = d3.rgb(colormap(canvasScl(i)));
        cmlImage.data[k++] = c.r;
        cmlImage.data[k++] = c.g;
        cmlImage.data[k++] = c.b;
        cmlImage.data[k++] = 255;
      }
  }
  // display cmlImage inside canvas
  cmlContext.putImageData(cmlImage, 0, 0);

  // creating lerp fn to go between the colormap fn domain and the canvas coords (unlerp of canvasScl)
  var tScl = d3.scale.linear()
    .domain([minUN, maxUN])
    .range([0, CmapLegSize]);

  // selecting all of the ticks and updating the x coordinates of the top and bottom of the tick line
  // it's univariate so they can both use the same function
  d3.select("#cmlTicks").selectAll("line")
      .data(arrUN)
    .attr("x1", function(d) {return tScl(d);} ) 
    .attr("x2", function(d) {return tScl(d);} ); 

  // disabling the circles just in case
  d3.select("#cmlCircs").attr("display", "none");

  // enabling the ticks
  d3.select("#cmlTicks").attr("display", null);

  // Updating axes labels so xrange is [minUN, maxUN] and y isn't labeled because univariate
  d3.select("#xminlabel").html("<text>" + minUN + "</text>");
  d3.select("#xmaxlabel").html("<text>" + maxUN + "</text>");
  d3.select("#yminlabel").html("<text>" + "</text>");
  d3.select("#ymaxlabel").html("<text>" + "</text>");

}

// returning the colormapping function that takes in an unemployment value
function colormapUN(data){
  // precalulating max/min/diff bc they'll be used for generating the color lerp functions later
  var maxUN = d3.max(data);
  var minUN = d3.min(data);
  var diffUN = maxUN - minUN;

  var ret = function(d) {
    // calculating where the data fractionally falls in the range between the max and min
    var v = (+d - minUN) / diffUN;

    var i, color;

    // Because there are 2 control points, the colormap function uses a different color lerp 
    // within each third
    if (v <= 1/3) {
      // lerp btwn rgb(0,0,0), rgb(230,0,0))
      i = d3.interpolateRgb(d3.rgb(0,0,0), d3.rgb(230,0,0));
      // lerping from [0, 1/3] to [0, 1]
      v = v*3;
      // getting color
      color = i(v);
    } else if (v <= 2/3){
      // lerp btwn rgb(230,0,0), rgb(255,230,0)
      i = d3.interpolateRgb(d3.rgb(230,0,0), d3.rgb(255,230,0));
      // lerping from [1/3, 2/3] to [0, 1]
      v = (v-(1/3))*3;
      // getting color
      color = i(v);
    } else {
      // lerp btwn rgb(255,230,0), rgb(255,255,255)
      i = d3.interpolateRgb(d3.rgb(255,230,0), d3.rgb(255,255,255));
      // lerping from [2/3, 1] to [0, 1]
      v = (v-(2/3))*3;
      // getting color
      color = i(v);
    }

    return color;
  };

  return ret;
}

function setInfantMortality(data){ // Jasmine
  /* "Infant Mortality (univariate)" / "IM" / "InfantMortality": a path through HCL space in which the variation 
  * of each coordinate is as follows: hue angle H varies linearly from 330 to -15; chroma C is 25*sin(pi*x)^2 as 
  * x varies from 0 to 1; L is 100*x as x varies from 0 to 1. This is an example of a "spiral" colormap that 
  * monotonically increases luminance while rotated through some hues.  Tickmarks should show the InfantMortality 
  * values.
  */

  // Get array of all IM data
  var arrIM = data.map(function(d) { return +d.InfantMortality; });

  // calling the function to generate the colormap function for IM
  var colormap = colormapIM(arrIM);

  // selecting and updating the state path elements with the colormap function to select a new fill color
  var states = d3.select("#mapUS").selectAll("path")
      .data(arrIM)
    .style("fill", colormap);

  // getting the canvas size and copied code from index.html to select the canvas and create
  // a new canvas image data to replace the old canvas data with
  var CmapLegSize = window.CmapLegSize; 
  var canvas = document.querySelector("canvas");
  canvas.width = CmapLegSize;
  canvas.height = CmapLegSize;
  var cmlContext = canvas.getContext("2d");
  var cmlImage = cmlContext.createImageData(CmapLegSize, CmapLegSize);

  // Calculating minimum and maximum of IM data for lerping
  var maxIM = d3.max(arrIM);
  var minIM = d3.min(arrIM);

  // creating the lerp function for going between canvas coords and the colormap function domain
  var canvasScl = d3.scale.linear()
    .domain([0, CmapLegSize])
    .range([minIM, maxIM]);

  // copied code from index.html to modify new canvas data with the colormap fn for IM
  for (var j=0, k=0; j < CmapLegSize; ++j) {
      for (var i=0; i < CmapLegSize; ++i) {
          // using the lerp to go between canvas coords, and the colormap fn domain and then getting the 
          // color by passing to the colormap function and converting to rgb
          var c = d3.rgb(colormap(canvasScl(i)));
          cmlImage.data[k++] = c.r;
          cmlImage.data[k++] = c.g;
          cmlImage.data[k++] = c.b;
          cmlImage.data[k++] = 255;
      }
  }
  // display cmlImage inside canvas
  cmlContext.putImageData(cmlImage, 0, 0);

  // creating lerp fn to go between the colormap fn domain and the canvas coords (unlerp of canvasScl)
  var tScl = d3.scale.linear()
    .domain([minIM, maxIM])
    .range([0, CmapLegSize]);

  // selecting all of the ticks and updating the x coordinates of the top and bottom of the tick line
  // it's univariate so they can both use the same function
  d3.select("#cmlTicks").selectAll("line")
      .data(arrIM)
    .attr("x1", function(d) {return tScl(d);} ) 
    .attr("x2", function(d) {return tScl(d);} ); 

  // disabling the circles just in case
  d3.select("#cmlCircs").attr("display", "none");

  // enabling the ticks
  d3.select("#cmlTicks").attr("display", null);

  // Updating axes labels to reflect rounded min and max for xmin, and none for ymin (univariate)
  d3.select("#xminlabel").html("<text>" + minIM + "</text>");
  d3.select("#xmaxlabel").html("<text>" + maxIM + "</text>");
  d3.select("#yminlabel").html("<text>" + "</text>");
  d3.select("#ymaxlabel").html("<text>" + "</text>");
}

function colormapIM(data){
  // Locally calculate min and max of IM data
  var minIM = d3.min(data);
  var maxIM = d3.max(data);

  return function(d) { // produces color with above specifications
    // defining 'x' as used above; correcting so 0 < x < 1
    var frac = (+d - minIM) / (maxIM - minIM);

    // calculated as pointed out above
    var H = 330 - (frac * 345);
    var C = 25 * (Math.pow(Math.sin(Math.PI * frac), 2));
    var L = 100 * frac;

    // making an HCL object, then making that a hex string to connect to fill
    var colorIM = d3.hcl(H, C, L);
    var colorIMrgb = colorIM.toString();

    // returning the hex string of our HCL color
    return colorIMrgb; };
}

function setVotesUnivariate(data){ // JASMINE
  /* "Obama,Romney votes (univariate)" / "VU" / "ObamaVotes" and "RomneyVotes": The quantity to colormap, let's 
  * call it PL for political leaning, has to be computed from the data (it isn't already a column in the csv): 
  * PL = (Ob)/(1 + Rm + Ob) and Rm and Ob are numbers of Romney and Obama votes, respectively (the "1+" is to 
  * side-step possible divide-by-zero).  PL=0 means very Republican; PL=1 means very Democratic (ignoring 
  * third-party votes). Unlike the other univariate colormaps, your colormap of PL should always cover PL in [0,1], 
  * regardless of what appears in the data.  The colormap should range from rgb(210,0,0) for PL=0 to a gray for 
  * PL=0.5 to rgb(0,0,210) for PL=1, but defined in terms of the individual coordinates in HCL space, over the two 
  * PL intervals [0,0.5] and [0.5,1]. The hue angle H should be one constant value for PL<0.5 and another constant 
  * value for PL>0.5. L varies with a single linear ramp from PL=0 to PL=1. The chroma C variation is more involved: 
  * let Cmin = chroma C(rgb(210,0,0)) and Cmax=C(rgb(0,0,210)), and let Cscl be Cmin for PL<0.5 and Cmax for PL>0.5.  
  * The final univariate colormap chroma is then C(PL) = Cscl*(1 - (1 - |PL-0.5|/0.5)^4) where |PL-0.5| is the 
  * absolute value of PL-0.5.  Tickmarks should show the PL values over the domain [0,1].
  */

  // Creating array of all PL data
  var arrVU = data.map(function(d) { return d.PL; });

  // calling the function to generate the colormap function for VU
  colormap = colormapVU(arrVU);

  // selecting and updating the state path elements with the colormap function to select a new fill color
  var states = d3.select("#mapUS").selectAll("path")
      .data(arrVU)
    .style("fill", colormap);

  // getting the canvas size and copied code from index.html to select the canvas and create
  // a new canvas image data to replace the old canvas data with
  var CmapLegSize = window.CmapLegSize; 
  var canvas = document.querySelector("canvas");
  canvas.width = CmapLegSize;
  canvas.height = CmapLegSize;
  var cmlContext = canvas.getContext("2d");
  var cmlImage = cmlContext.createImageData(CmapLegSize, CmapLegSize);

  // creating the lerp function for going between canvas coords and the colormap function domain
  var canvasScl = d3.scale.linear()
    .domain([0, CmapLegSize])
    .range([0, 1]);

  // copied code from index.html to modify new canvas data with the colormap fn for VU
  for (var j=0, k=0; j < CmapLegSize; ++j) {
      for (var i=0; i < CmapLegSize; ++i) {
          // using the lerp to go between canvas coords, and the colormap fn domain and then getting the 
          // color by passing to the colormap function and converting to rgb
          var c = d3.rgb(colormap(canvasScl(i)));
          cmlImage.data[k++] = c.r;
          cmlImage.data[k++] = c.g;
          cmlImage.data[k++] = c.b;
          cmlImage.data[k++] = 255;
      }
  }

  // display cmlImage inside canvas
  cmlContext.putImageData(cmlImage, 0, 0);

  // creating lerp fn to go between the colormap fn domain and the canvas coords (unlerp of canvasScl)
  var tScl = d3.scale.linear()
    .domain([0, 1])
    .range([0, CmapLegSize]);

  // selecting all of the ticks and updating the x coordinates of the top and bottom of the tick line
  // it's univariate so they can both use the same function
  d3.select("#cmlTicks").selectAll("line")
      .data(arrVU)
    .attr("x1", function(d) {return tScl(d);} ) 
    .attr("x2", function(d) {return tScl(d);} ); 


  // disabling the circles just in case
  d3.select("#cmlCircs").attr("display", "none");

  // enabling the ticks
  d3.select("#cmlTicks").attr("display", null);

  // Updating axes labels to be rounded min and max of votes; no y because univariate
  d3.select("#xminlabel").html("<text>" + Math.round(d3.min(arrVU)) + "</text>");
  d3.select("#xmaxlabel").html("<text>" + Math.round(d3.max(arrVU)) + "</text>");
  d3.select("#yminlabel").html("<text>" + "</text>");
  d3.select("#ymaxlabel").html("<text>" + "</text>");
}

function colormapVU(data){
  return function (d) {
    // define Cmin and Cmax as above 
    var H, C, L, Cscl;
    var Cmin = d3.hcl(d3.rgb(210,0,0));
    var Cmax = d3.hcl(d3.rgb(0,0,210));

    // assign H, Cscl depending whether PL > 0.5 or PL < 0.5
    if (d < 0.5) {
      Cscl = Cmin.c;
      H = Cmin.h;
    } 
    else {
      Cscl = Cmax.c;
      H = Cmax.h;
    }

    // calculating C from equation given
    var x = 1 - Math.pow(1 - Math.abs(d- 0.5) / 0.5, 4);
    C = Cscl * x;

    // lerping between the l of the blue and red (Cmin, Cmax)
    var funcL = d3.interpolate(Cmin.l, Cmax.l);
    L = funcL(d);

    // making new HCL object
    var hclVU = d3.hcl(H, C, L);

    // return it as a string to use for fill
    return hclVU.toString();
} 
}


function setVotesBivariate(data){
  /* "Obama,Romney votes (bivariate)" / "VB" / "ObamaVotes" and "RomneyVotes": For each state, let 
  * VT=ObamaVotes + RomneyVotes in that state, let VN=min(1,VT/max(VT)) where max(VT) is the maximum VT in any state 
  * (currently, California) and min(a,b) is the minimum of a and b, and let VA=1-(1-VN)^3. The color for this 
  * bivariate colormap should be a linear blend between white (hcl(0,0,100)) at VA=0 to the color determined above 
  * for "Obama,Romney votes (univariate)" at VA=1. Note that hue H should be constant during the blend with white.  
  * The colormap legend should show the variation of PL along the horizontal, as well as the variation of VA on the 
  * vertical, from VA=0 at the bottom to VA=1 at the top.  The circular tickmarks for each state should be laid out 
  * on the same axes.
  */

  // Generating arrays of all the VT, VA, and PL data
  var arrVB = data.map(function(d) { return d.VT; });
  var arrVA = data.map(function(d) { return d.VA; });
  var arrPL = data.map(function(d) { return d.PL; });

  // Calculating min and max of VT array for lerping
  var maxVB = d3.max(arrVB);
  var minVB = d3.min(arrVB);

  // calling the function to generate the colormap function for VB
  var colormap = colormapVB(data);

  // selecting and updating the state path elements with the colormap function to select a new fill color
  var states = d3.select("#mapUS").selectAll("path")
      .data(data)
    .style("fill", colormap);

  // getting the canvas size and copied code from index.html to select the canvas and create
  // a new canvas image data to replace the old canvas data with
  var CmapLegSize = window.CmapLegSize; 
  var canvas = document.querySelector("canvas");
  canvas.width = CmapLegSize;
  canvas.height = CmapLegSize;
  var cmlContext = canvas.getContext("2d");
  var cmlImage = cmlContext.createImageData(CmapLegSize, CmapLegSize);

  // creating the lerp function for going between canvas coords and the colormap function domain
  var canvasScl = d3.scale.linear()
    .domain([0, CmapLegSize])
    .range([0, 1]);

  // copied code from index.html to modify new canvas data with the colormap fn for VB
  for (var j=0, k=0; j < CmapLegSize; ++j) {
      for (var i=0; i < CmapLegSize; ++i) {
          // creating a dictionary with PL and VA by lerping between canvas coords
          // and the colormap domain. the VA coord is inverted because the j counter is the inverse 
          // of the actual y coord 
          var d = { PL: canvasScl(i), VA: canvasScl(CmapLegSize - j)};
          var c = d3.rgb(colormap(d));
          cmlImage.data[k++] = c.r;
          cmlImage.data[k++] = c.g;
          cmlImage.data[k++] = c.b;
          cmlImage.data[k++] = 255;
      }
  }

  // display cmlImage inside canvas
  cmlContext.putImageData(cmlImage, 0, 0);

  // creating lerp fn to go between the colormap fn domain and the canvas coords (unlerp of canvasScl)
  var tScl = d3.scale.linear()
    .domain([0, 1])
    .range([0, CmapLegSize]);

  // selecting all of the circles and updating the x & y coord of the data point with VA and PL
  // the x and y have the same domain so they can both use the same function
  d3.select("#cmlCircs").selectAll("circle")
      .data(data)
    .attr("cx", function(d) { return tScl(d.PL); }) // update
    .attr("cy", function(d) { return CmapLegSize-1-tScl(d.VA); }); // update

  // disabling ticks
  d3.select("#cmlTicks").attr("display", "none");

  // enabling circles
  d3.select("#cmlCircs").attr("display", null);

  // Updating axes, Y is min/max PL and X is min/max VA
  d3.select("#xminlabel").html("<text>" + Math.round(d3.min(arrVA)) + "</text>");
  d3.select("#xmaxlabel").html("<text>" + Math.round(d3.max(arrVA)) + "</text>");
  d3.select("#yminlabel").html("<text>" + Math.round(d3.min(arrPL)) + "</text>");
  d3.select("#ymaxlabel").html("<text>" + Math.round(d3.max(arrPL)) + "</text>");

}

function colormapVB(data) {

  return function(d) {
    // Grabbing the VA
    var VA = d.VA;

    // Defining the whiteHCl as HCL object for ease of lerping later
    var whiteHCL = d3.hcl(0,0,100);

    // getting univariate colormap fn from prev map
    var vuColormap = colormapVU(data);

    // Grabbing the color calculated from the Univariate votes above
    var colorUN = d3.hcl(vuColormap(d.PL));

    // lerping between white and previously calculated Univariate color
    var C = d3.interpolate(whiteHCL.c, colorUN.c);
    var L = d3.interpolate(whiteHCL.l, colorUN.l);

    /* creating new HCL color, maintaining hue from previously calculated Univariate color,
       and the lerps directly above */
    var newHCL = d3.hcl(colorUN.h, C(VA), L(VA));

    // returning hex string to plug in for fill 
    return newHCL.toString();
  }

}

function setEarningsSymmetric(data){
  /* "Men's,Women's Earnings (bivariate, symmetric)" / "ES" / "WomenEarning" and "MenEarning" : Let Emax be the 
  * highest earnings across genders and states.  For each state, let esw=WomenEarning/Emax and esm=MenEarning/Emax. 
  * The colormap should be specified in LAB space, with L=25+40*(esw + esm), A=0, and B=170*(esm-esw);  The colormap 
  * legend (and the circular marks on top of it) should show MenEarning on the horizontal (increasing towards right) 
  * and WomenEarning on vertical (increasing towards up), with both axes covering the domain [0,Emax].  All the states 
  * should be yellow or gold (positive B coordinate in LAB), since men make more than women in all states.
  */
  
  // getting all of the mens, womens earning values for each state in respective arrays
  var arrESM = data.map(function(d) { return d.MenEarning; });
  var arrESW = data.map(function(d) { return d.WomenEarning; });

  // joining all of the earnings info and calculating the max to get a domain for data
  var arrES = arrESM.concat(arrESW);
  var maxES = d3.max(arrES)

  // calling the function to generate the colormap function for ES
  var colormap = colormapES(arrES);

  // selecting and updating the state path elements with the colormap function to select a new fill color
  var states = d3.select("#mapUS").selectAll("path")
      .data(data)
    .style("fill", colormap);

  // getting the canvas size and copied code from index.html to select the canvas and create
  // a new canvas image data to replace the old canvas data with
  var CmapLegSize = window.CmapLegSize; 
  var canvas = document.querySelector("canvas");
  var cmlContext = canvas.getContext("2d");
  var cmlImage = cmlContext.createImageData(CmapLegSize, CmapLegSize);

  // creating the lerp function for going between canvas coords and the colormap function domain
  // we only need one because we're combining the domain of all the earnings data
  var canvasScl = d3.scale.linear()
    .domain([0, CmapLegSize])
    .range([0, maxES]);

  for (var j=0, k=0; j < CmapLegSize; ++j) {
      for (var i=0; i < CmapLegSize; ++i) {
          // creating a dictionary with WomenEarning and MenEarning by lerping between canvas coords
          // and the colormap domain. the WomenEarning coord is inverted because we want it increase 
          // as the y coordinate goes up (which goes down as the j counter goes up)
          var d = { WomenEarning: canvasScl(CmapLegSize - j), MenEarning: canvasScl(i)};
          var c = d3.rgb(colormap(d));
          cmlImage.data[k++] = c.r;
          cmlImage.data[k++] = c.g;
          cmlImage.data[k++] = c.b;
          cmlImage.data[k++] = 255;
      }
  }
  // display cmlImage inside canvas
  cmlContext.putImageData(cmlImage, 0, 0);

  // creating lerp fn to go between the colormap fn domain and the canvas coords (unlerp of canvasScl)
  var tScl = d3.scale.linear()
    .domain([0, 1])
    .range([0, CmapLegSize]);

  // selecting all of the circles and updating the x & y coord of the data point with the
  // fractional amount of the data point out of the max value
  // the x and y have the same domain so they can both use the same function
  d3.select("#cmlCircs").selectAll("circle")
      .data(data)
    .attr("cx", function(d) { return tScl(+d.MenEarning/maxES); }) // update
    .attr("cy", function(d) { return CmapLegSize-1-tScl(+d.WomenEarning/maxES); }); // update

  // disabling the ticks just in case
  d3.select("#cmlTicks").attr("display", "none");

  // enabling the circles for viewing
  d3.select("#cmlCircs").attr("display", null);

  // setting the canvas axis information by selecting the element with d3 and updating the html
  // using Math.round so the numbers aren't large to print and don't overwhelm the canvas
  d3.select("#xminlabel").html("<text>" + 0 + "</text>");
  d3.select("#xmaxlabel").html("<text>" + Math.round(maxES) + "</text>");
  d3.select("#yminlabel").html("<text>" + 0 + "</text>");
  d3.select("#ymaxlabel").html("<text>" + Math.round(maxES) + "</text>");
}

function colormapES(data){
  // calculating max bc it gets used later on 
  var maxES = d3.max(data);

  return function(d){
    // calculating fractional amounts of the data point out of the max value
    var ESW = +d.WomenEarning/maxES;
    var ESM = +d.MenEarning/maxES;

    // following the specs and calculating the lab representation of the color mapping for the data
    var l = 25 + 40*(ESW + ESM);
    var a = 0;
    var b = 170*(ESM - ESW);

    // converting to a hex string and returning it
    return d3.lab(l, a, b).toString();
  }
}

function setEarningsRecentered(data){
  /* "Men's,Women's Earnings (bivariate, re-centered)" / "ER" / "WomenEarning" and "MenEarning": Like above, but with
  *  a shifted domain for the colormap. Let EWmax and EMmax be the highest earnings for woman and men, respectively, 
  * over all states, and similarly let EWmin and EMmin be the lowest earnings for woman and men, respectively, over 
  * all states. For each state, let erw=(WomenEarning-EWmin)/(EWmax-EWmin) and erm=(MenEarning-EMmin)/(EMmax-EMmin). 
  * The colormap is then L=25+40*(erw + erm), A=0, and B=170*(erm-erw).  A more principled (and more complicated to 
  * implement) approach would re-center the colormap so that the average earning ratio between women and men would be 
  * mapped to the grays where B=0.
  */

  // getting all of the mens, womens earning values for each state in respective arrays
  var arrERM = data.map(function(d) { return d.MenEarning; });
  var arrERW = data.map(function(d) { return d.WomenEarning; });

  // getting min/max of womens and men's earnings
  var maxERM = d3.max(arrERM);
  var maxERW = d3.max(arrERW);
  var minERM = d3.min(arrERM);
  var minERW = d3.min(arrERW);

  // calling the function to generate the colormap function for ER
  var colormap = colormapER(arrERM, arrERW);

  // selecting and updating the state path elements with the colormap function to select a new fill color
  var states = d3.select("#mapUS").selectAll("path")
      .data(data)
    .style("fill", colormap);

  // getting the canvas size and copied code from index.html to select the canvas and create
  // a new canvas image data to replace the old canvas data with
  var CmapLegSize = window.CmapLegSize; 
  var canvas = document.querySelector("canvas");
  canvas.width = CmapLegSize;
  canvas.height = CmapLegSize;
  var cmlContext = canvas.getContext("2d");
  var cmlImage = cmlContext.createImageData(CmapLegSize, CmapLegSize);

  // creating the lerp functions for going between canvas coords and the colormap function domain
  // we only need two because we are using a different domain for men's earnings and women's earnings
  var canvasSclx = d3.scale.linear()
    .domain([0, CmapLegSize])
    .range([minERM, maxERM]);

  var canvasScly = d3.scale.linear()
    .domain([0, CmapLegSize])
    .range([minERW, maxERW]);

  for (var j=0, k=0; j < CmapLegSize; ++j) {
      for (var i=0; i < CmapLegSize; ++i) {
          // creating a dictionary with WomenEarning and MenEarning by lerping between canvas coords
          // and the colormap domain. the WomenEarning coord is inverted because we want it increase 
          // as the y coordinate goes up (which goes down as the j counter goes up)
          var d = { WomenEarning: canvasScly(CmapLegSize - j), MenEarning: canvasSclx(i)};
          var c = d3.rgb(colormap(d));
          cmlImage.data[k++] = c.r;
          cmlImage.data[k++] = c.g;
          cmlImage.data[k++] = c.b;
          cmlImage.data[k++] = 255;
      }
  }
  // display cmlImage inside canvas
  cmlContext.putImageData(cmlImage, 0, 0);

  // creating lerp fn to go between the colormap fn domains and the canvas coords (unlerp of canvasScl)
  var tScl = d3.scale.linear()
    .domain([0, 1])
    .range([0, CmapLegSize]);

  // selecting all of the circles and updating the x & y coord of the data point with the
  // fractional amount of the data point out of the max value
  // the x and y have the same domain so they can both use the same function
  d3.select("#cmlCircs").selectAll("circle")
      .data(data)
    .attr("cx", function(d) { return tScl((+d.MenEarning - minERM)/(maxERM - minERM)); }) 
    .attr("cy", function(d) { return CmapLegSize-1-tScl((+d.WomenEarning - minERW)/(maxERW - minERW)); }); 

  // disabling the ticks just in case
  d3.select("#cmlTicks").attr("display", "none");

  // enabling the circles for viewing
  d3.select("#cmlCircs").attr("display", null);

  // setting the canvas axis information by selecting the element with d3 and updating the html
  // using Math.round so the numbers aren't large to print and don't overwhelm the canvas
  d3.select("#xminlabel").html("<text>" + Math.round(minERM) + "</text>");
  d3.select("#xmaxlabel").html("<text>" + Math.round(maxERM) + "</text>");
  d3.select("#yminlabel").html("<text>" + Math.round(minERW) + "</text>");
  d3.select("#ymaxlabel").html("<text>" + Math.round(maxERW) + "</text>");
}

function colormapER(data_men, data_women){
  // calculating min/max bc it gets used later on 
  var maxERM = d3.max(data_men);
  var maxERW = d3.max(data_women);
  var minERM = d3.min(data_men);
  var minERW = d3.min(data_women);

  return function(d){
    // calculating fractional amounts of the data point out of their respective max value
    var ERW = (+d.WomenEarning - minERW)/(maxERW - minERW);
    var ERM = (+d.MenEarning - minERM)/(maxERM - minERM);

    // following the specs and calculating the lab representation of the color mapping for the data
    var l = 25 + 40*(ERW + ERM);
    var a = 0;
    var b = 170*(ERM - ERW);

    // converting to a hex string and returning it
    return d3.lab(l, a, b).toString();
  }
}

// wrote a function that given an interval representing [0,1], will lerp t and return rgb 
function rgbLerp(rgb0, rgb1, t){
  var r = (1-t)*rgb0.r + t*rgb1.r;
  var g = (1-t)*rgb0.g + t*rgb1.g;
  var b = (1-t)*rgb0.b + t*rgb1.b;
  return d3.rgb(r, g, b);

}
