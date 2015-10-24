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
  //      initial values.
  //
  //    - The second one ('display' here) is passed
  //      to the displayNetwork function, and specifies
  //      display settings. 
  // 
  // See the displayNetwork function in netjs.js for
  // details on all required and optional arguments.
  //
  var args            = {};
  var display         = {};

  args.matrices       = ["data/dataset2/Znet1.txt", "data/dataset2/Znet2.txt"];
  args.matrixLabels   = ["Corr1", "Corr2"];
  args.nodeData       = ["data/dataset2/clusters.txt"];
  args.nodeDataLabels = ["Cluster number"];
  args.linkage        =  "data/dataset2/linkages.txt";
  args.thumbnails     =  "data/dataset2/melodic_IC_sum.sum";
  args.thresFunc      = thresholdMatrix;
  args.thresVals      = [0.75];
  args.thresLabels    = ["Thres perc"];
  args.thresholdIdx   = 0;
  args.numClusters    = 10;

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

