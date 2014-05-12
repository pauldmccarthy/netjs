netctrl = (function() {

  function createNetworkControls(network, div) {

    div = document.getElementById(div);

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
          netvis.setNumClusters(network, parseInt(this.value));
          netvis.redrawNetwork(network);
        };

      edgeColourScale
        .onchange = function() {
          netvis.setEdgeColourWeightIdx(network, parseInt(this.value));
          netvis.redrawNetwork(network);
        };

      edgeWidthScale
        .onchange = function() {
          netvis.setEdgeWidthWeightIdx(network, parseInt(this.value));
          netvis.redrawNetwork(network);
        };

      div.appendChild(html);
    });

  }


  var ncPublic = {}; 
  ncPublic.createNetworkControls = createNetworkControls;
  return ncPublic;
}());
