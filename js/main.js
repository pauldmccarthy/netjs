require(["netjs", "lib/d3"], function(netjs, d3) {

  // Implement your own network edge
  // thresholding algorithm here.
  function thresholdMatrix(matrix, args) {

    var threshold   = args[0];
    var thresMatrix = [];

    for (var i = 0; i < matrix.length; i++) {

      thresMatrix.push([]);

      for (var j = 0; j < matrix[i].length; j++) {

        if (Math.abs(matrix[i][j]) < threshold)
          thresMatrix[i].push(Number.NaN);
        else
          thresMatrix[i].push(matrix[i][j]);
      }
    }

    return thresMatrix;
  }

  // You need to populate two objects:
  //
  //    - The first one ('args' here) is passed to
  //      the loadNetwork function, and specifies
  //      data file locations, labels, and some
  //      initial values. See the loadNetwork
  //      function in netdata.js for detail on all
  //      arguments.

  //
  //    - The second one ('display' here) is passed
  //      to the displayNetwork function, and specifies
  //      display settings. See the displayNetwork
  //      function in netjs.js for details on all
  //      required and optional arguments.
  //
  var args             = {};
  var display          = {};

  var matrices      = document.getElementById("matrices")     .getAttribute("data");
  var linkages      = document.getElementById("linkages")     .getAttribute("data");
  var names         = document.getElementById("names")        .getAttribute("data");
  var orders        = document.getElementById("orders")       .getAttribute("data");
  var groups        = document.getElementById("groups")       .getAttribute("data");
  var thumbnails    = document.getElementById("thumbnails")   .getAttribute("data");
  var images        = document.getElementById("images")       .getAttribute("data");
  var underlay      = document.getElementById("underlay")     .getAttribute("data");
  var image_size    = document.getElementById("image_size")   .getAttribute("data");
  var matrix_labels = document.getElementById("matrix_labels").getAttribute("data");
  var name_labels   = document.getElementById("name_labels")  .getAttribute("data");
  var order_labels  = document.getElementById("order_labels") .getAttribute("data");
  var group_labels  = document.getElementById("group_labels") .getAttribute("data");

  args.matrices = matrices.split("|");

  if (linkages      !== "") args.linkage         = linkages     .split("|");
  if (names         !== "") args.nodeNames       = names        .split("|");
  if (orders        !== "") args.nodeOrders      = orders       .split("|");
  if (groups        !== "") args.nodeData        = groups       .split("|");
  if (thumbnails    !== "") args.thumbnails      = thumbnails   .split("|");
  if (images        !== "") args.images          = images       .split("|");
  if (matrix_labels !== "") args.matrixLabels    = matrix_labels.split("|");
  if (name_labels   !== "") args.nodeNameLabels  = name_labels  .split("|");
  if (order_labels  !== "") args.nodeOrderLabels = order_labels .split("|");
  if (group_labels  !== "") args.nodeDataLabels  = group_labels .split("|");


  // you can specify a custom
  // thresholding function here
  args.thresFunc       = thresholdMatrix;
  args.thresVals       = [0.75];
  args.thresLabels     = ["Threshold"];
  args.thresholdIdx    = 0;

  // Draw nodes this many pixels
  // from the canvas edge
  display.nodeRadiusOffset = 150;

  // Draw edges this many
  // pixels from the nodes
  display.edgeRadiusOffset = 20;

  // Node radius
  display.nodeSize = 5;

  display.networkDiv = "#network";
  display.controlDiv = "#control";
  display.canvasDiv  = "#viewer";
  display.imageDivs  = ["#imageUnderlay", "#imageOverlay"];

  if (image_size !== "") {
    image_size = image_size.split("|");
    display.imageSize = [parseInt(image_size[0]), parseInt(image_size[1])]
  }
  if (underlay !== "")
    display.underlay = underlay;

  display.edgeColourMin = 0.0;
  display.edgeColourMax = 1.0;
  display.edgeWidthMin  = 0.0;
  display.edgeWidthMax  = 1.0;

  // Figure out a sensible canvas size.
  var w  = window.innerWidth  - 200;
  var h  = window.innerHeight - 200;
  var sz = Math.min(w, h);

  display.networkWidth  = sz;
  display.networkHeight = sz;

  display.highlightOn = true;

  // Load the network, and
  // display it when loaded.
  netjs.loadNetwork(args, function(net) {
    net.thresholdValues[0] = net.matrixMins[0] + 0.75 * (net.matrixMaxs[0] - net.matrixMins[0]);
    netjs.displayNetwork(net, display);
  });
});
