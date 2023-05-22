require(["netjs", "lib/d3"], function(netjs, d3) {

  // Implement your own network edge
  // thresholding algorithm here.
  function thresholdMatrix(matrix, args) {

    var threshold   = args[0];
    var thresMatrix = [];

    for (var i = 0; i < matrix.length; i++) {

      thresMatrix.push([]);

      for (var j = 0; j < matrix[i].length; j++) {

        var val = Math.abs(matrix[i][j]);

        if (val < threshold) thresMatrix[i].push(Number.NaN);
        else                 thresMatrix[i].push(matrix[i][j]);
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

  // Generate thumbnail file names (0000.png - 0099.png)
  var thumbnails = [...Array(100).keys()];
  thumbnails     = thumbnails.map(({ t }) => d3.format("%04d")(t));
  thumbnails     = thumbnails.map(({ t }) => "data/dataset2/melodic_IC_sum.sum/" + t);

  args.matrices        = ["data/dataset2/Znet1.txt", "data/dataset2/Znet2.txt"];
  args.matrixLabels    = ["Corr1", "Corr2"];
  args.nodeData        = ["data/dataset2/clusters.txt"];
  args.nodeDataLabels  = ["Cluster number"];
  args.nodeNames       = ["data/dataset2/names.txt"];
  args.nodeNameLabels  = ["Names"];
  args.linkage         =  "data/dataset2/linkages.txt";
  args.nodeOrders      = ["data/dataset2/order1.txt"];
  args.nodeOrderLabels = ["Order 1"];
  args.thumbnails      = thumbnails;
  args.thresFunc       = thresholdMatrix;
  args.thresVals       = [0.75];
  args.thresLabels     = ["Thres perc"];
  args.thresholdIdx    = 0;
  args.nodeNameIdx     = -1;
  args.nodeOrderIdx    = -1;
  args.numClusters     = 10;

  // Figure out a sensible canvas size.
  var w  = window.innerWidth  - 200;
  var h  = window.innerHeight - 50;
  var sz = Math.min(w/2.0, h);

  display.networkDiv    = "#fullNetwork";
  display.subNetDiv     = "#subNetwork";
  display.controlDiv    = "#networkCtrl";
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
