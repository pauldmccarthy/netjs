netctrl = (function() {

  function createNetworkControls(network, div) {

    div = d3.select("#networkCtrl");


    div = div
      .append("input")
      .attr("type",  "number")
      .attr("min",   "1")
      .attr("max",   "10")
      .attr("step",  "1")
      .attr("value", "1")
      .on("change", function(ev) { 
        netvis.setNumClusters(network, parseInt(this.value));
        netvis.redrawNetwork(network);
      });
  }


  var ncPublic = {}; 
  ncPublic.createNetworkControls = createNetworkControls;
  return ncPublic;
}());
