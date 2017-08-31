require(["netjs", "lib/d3"], function(netjs, d3) {

  // Implement your own network edge
  // thresholding algorithm here.
  function thresholdMatrix(matrix, args) {

    var thresPerc = args[0];

    var thresMatrix = [];
    var nodeThress  = [];

    for (var i = 0; i < matrix.length; i++) {
      absVals = matrix[i].map(function(val) {return Math.abs(val);});
      nodeThress.push(d3.max(absVals) * thresPerc);
    }

    for (var i = 0; i < matrix.length; i++) {

      thresMatrix.push([]);

      for (var j = 0; j < matrix[i].length; j++) {

        if (Math.abs(matrix[i][j]) < nodeThress[i] ||
            Math.abs(matrix[i][j]) < nodeThress[j])

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
  var matrix_labels = document.getElementById("matrix_labels").getAttribute("data");
  var name_labels   = document.getElementById("name_labels")  .getAttribute("data");
  var order_labels  = document.getElementById("order_labels") .getAttribute("data");
  var group_labels  = document.getElementById("group_labels") .getAttribute("data");

  args.matrices = matrices.split("|");

  if (linkages      !== "") args.linkages        = linkages     .split("|");
  if (names         !== "") args.nodeNames       = names        .split("|");
  if (orders        !== "") args.nodeOrders      = orders       .split("|");
  if (groups        !== "") args.nodeData        = groups       .split("|");
  if (thumbnails    !== "") args.thumbnails      = thumbnails   .split("|");
  if (matrix_labels !== "") args.matrixLabels    = matrix_labels.split("|");
  if (name_labels   !== "") args.nodeNameLabels  = name_labels  .split("|");
  if (order_labels  !== "") args.nodeOrderLabels = order_labels .split("|");
  if (group_labels  !== "") args.nodeGroupLabels = group_labels .split("|");

  console.log(args.matrices);
  console.log(args.linkages);
  console.log(args.nodeNames);
  console.log(args.nodeOrders);
  console.log(args.nodeData);
  console.log(args.thumbnails);
  console.log(args.matrixLabels);
  console.log(args.nodeNameLabels);
  console.log(args.nodeOrderLabels);
  console.log(args.nodeGroupLabels);

  // you can specify a custom
  // thresholding function here
  args.thresFunc       = thresholdMatrix;
  args.thresVals       = [0.75];
  args.thresLabels     = ["Thres percentage"];
  args.thresholdIdx    = 0;

  // Set to -1 to use node indices as their names
  args.nodeNameIdx     = 0;

  // Set to -1 to lay out nodes
  // according to the dendrogram
  args.nodeOrderIdx    = 0;

  // intial number of clusters
  args.numClusters     = 10;

  // Draw nodes this many pixels
  // from the canvas edge
  display.nodeRadiusOffset = 150;

  // Draw edges this many
  // pixels from the nodes
  display.edgeRadiusOffset = 20;

  // Node radius
  display.nodeSize = 5;

  display.networkDiv    = "#fullNetwork";
  // display.subNetDiv     = "#subNetwork";
  display.controlDiv    = "#networkCtrl";


  // Figure out a sensible canvas size.
  var w  = window.innerWidth  - 200;
  var h  = window.innerHeight - 50;
  var sz = Math.min(w/2.0, h);
  display.networkWidth  = sz;
  display.networkHeight = sz;
  display.subNetWidth   = sz;
  display.subNetHeight  = sz;

  display.highlightOn   = true;

  // Load the network, and
  // display it when loaded.
  netjs.loadNetwork(args, function(net) {
    netjs.displayNetwork(net, display);
  });
});
