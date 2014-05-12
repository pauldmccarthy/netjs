
define(["lib/d3", "netdata", "netvis"], function(d3, netdata, netvis) {

  function createNetworkControls(network, div) {

    div = d3.select(div)[0][0];

    d3.html("/js/netctrl.html", function(error, html) {

      var numClustRange   = html.querySelector("#numClusts");
      var edgeColourScale = html.querySelector("#edgeColourScale");
      var edgeWidthScale  = html.querySelector("#edgeWidthScale");

      for (var i = 0; i < network.weightLabels.length; i++) {

        var opt = document.createElement("option");
        opt.value     = "" + i;
        opt.innerHTML = network.weightLabels[i];

        edgeColourScale.appendChild(opt);
        edgeWidthScale .appendChild(opt.cloneNode(true));
      }

      edgeColourScale.selectedIndex = network.edgeColourWeightIdx;
      edgeWidthScale .selectedIndex = network.edgeWidthWeightIdx;

      numClustRange
        .onchange = function() {
          netdata.setNumClusters(network, parseInt(this.value));
          netvis.redrawNetwork(network);
        };

      edgeColourScale
        .onchange = function() {
          netdata.setEdgeColourWeightIdx(network, parseInt(this.value));
          netvis.redrawNetwork(network);
        };

      edgeWidthScale
        .onchange = function() {
          netdata.setEdgeWidthWeightIdx(network, parseInt(this.value));
          netvis.redrawNetwork(network);
        };

      div.appendChild(html);
    });
  }

  var netctrl = {}; 
  netctrl.createNetworkControls = createNetworkControls;
  return netctrl;
});
