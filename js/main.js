
/** 
* Slider module.
* It behaves as a double thumbs slider where you can change both the
* the number of nodes and links.
* As you change the nodes or links, the other also changes bases on calculations.
* For instance if there are some nodes deleted, then you wont have the links corresponding to
* those nodes
**/
var Slider = (function(){
  var sliderNodeBtn, sliderLinkBtn, center=window.innerWidth/2, width= window.innerWidth*.7,
  height=window.innerHeight*0.2, nodeV, linkV, sliderMargin=20,sliderBtnRadius=12;
  var extremeLeft=center-width/2, extremeRight=center+width/2, yPos=height/3;
  
  /**
  * Updates the node slider based on the val passed
  * Also has a dontAnimation to animate while changing the position
  */
  var updateNodeSliderPos = function(val,dontAnimate){
     val = parseInt(val);
     var x = nodeV(val);
     sliderNodeBtn.attr("val",val);
     sliderNodeBtn.transition().duration(dontAnimate ? 0 : x/2).attr("cx",x);
     d3.select(".nodeLabel").transition().duration(dontAnimate ? 0 : x/2).attr("x",x);
     d3.select(".nodeLabel .label").html(val);
     d3.select(".lineActive").transition().duration(dontAnimate ? 0 : x/2).attr("x2",x);
  }

  /**
  * Updates the link slider based on the val passed
  * Also has a dontAnimation to animate while changing the position
  */
  var updateLinkSliderPos = function(val,dontAnimate){
     val = parseInt(val);
     var x = linkV(val);
     sliderLinkBtn.attr("val",val);
     sliderLinkBtn.transition().duration(dontAnimate ? 0 : x/2).attr("cx",x);
     d3.select(".linkLabel").transition().duration(dontAnimate ? 0 : x/2).attr("x",x)
     d3.select(".linkLabel .label").html(val);
     d3.select(".lineActive").transition().duration(dontAnimate ? 0 : x/2).attr("x1",x);
  }

  /**
  * Changes the position of either node or link slider 
  * based on user user drag. Will also update the other slider
  * as per the left over nodes or links
  */
  var dragmove = function(event) {
    var x = d3.event.x;
    if(x<(center-sliderMargin) && !sliderNodeBtn.classed("moving")){
      sliderLinkBtn.classed("moving",true);
      updateLinkSliderPos(linkV.invert(x),true);
    }else if(x>(center+sliderMargin) && !sliderLinkBtn.classed("moving")){
      sliderNodeBtn.classed("moving",true);
      updateNodeSliderPos(nodeV.invert(x),true);
    }
  }

  /** 
  * Once the drag ends, we have to recalculate the number of nodes and links
  **/  
  var dragend = function(){
    var value;
    if(sliderLinkBtn.classed("moving")){
      sliderLinkBtn.classed("moving",false);
      value = parseInt(parseInt(sliderLinkBtn.attr("val")));
      ForceLayout.updateLinks(value);
    }else if(sliderNodeBtn.classed("moving")){
      sliderNodeBtn.classed("moving",false);
      value = parseInt(parseInt(sliderNodeBtn.attr("val")));
      ForceLayout.updateNodes(value);
    }
  }

  /**
  * Append the label to show number of nodes & links
  **/
  var appendLabel = function(element,x,y,val,className){
    var fo = element.append("foreignObject")
                    .attr("class",className)
                    .attr("x",x)
                    .attr("y",y);
    fo.append("xhtml:div")
      .append("div")
      .attr("class","label")
      .html(val);
  }

  /**
  * The intial rendering of slider
  **/
  var drawSlider = function(){
    var count = ForceLayout.numNodesLinks();
    linkV = d3.scaleLinear().domain([1,count[1]]).rangeRound([center-sliderMargin, extremeLeft]).clamp(true);
    nodeV = d3.scaleLinear().domain([2, count[0]]).rangeRound([center+sliderMargin, extremeRight]).clamp(true);

    var drag = d3.drag()
                 .on("drag", dragmove)
                 .on("end",dragend)

    var svg = d3.select(".sliderBox")
                .append("svg")
              .attr("width", "100%")
              .attr("height", "100%")
  
    var sliderNode = svg.append("g");

    appendLabel(sliderNode,extremeRight,yPos+sliderMargin,parseInt(nodeV.invert(extremeRight)),"nodeLabel");

    sliderNodeBtn = sliderNode.append("circle")
      .attr("class","sliderButton nodeControl")
      .attr("r", sliderBtnRadius)
      .attr("cx", extremeRight)
      .attr("cy", yPos);

    var sliderLink = svg.append("g");

    appendLabel(sliderLink, extremeLeft,yPos+sliderMargin,parseInt(linkV.invert(extremeLeft)),"linkLabel");

    sliderLinkBtn =  sliderLink.append("circle")
      .attr("class","sliderButton linkControl")
      .attr("r", sliderBtnRadius)
      .attr("cx", extremeLeft)
      .attr("cy", yPos);

     var line = svg.append("line")
      .attr("x1", extremeLeft)
      .attr("x2", extremeRight)
      .attr("y1", yPos)
      .attr("y2", yPos)
      .style("stroke", "#000")
      .style("stroke-linecap", "round")
      .style("stroke-width", 8)
      .on("click",function(){
        //A click event is just another dragmove and dragend one after another
        dragmove();
        dragend();
      })
      .call(drag);
    }
    return {
        init : drawSlider,
        updateNodeSlider : updateNodeSliderPos,
        updateLinkSlider : updateLinkSliderPos
    }
})()

/**
* Force Layout module
* This has the starting point code for the force layout
* Also provides the API to add or remove nodes and links.
**/
var ForceLayout = (function(){
    var svg, link, node, graphOriginal, simulation;
    var width=window.innerWidth;
    var height=window.innerHeight;

    //Using the same color from the starting point code
    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var setup = function(callback){
      svg = d3.select('.forceLayoutBox').append('svg')
              .attr('width', "100%")
              .attr('height', "100%");
      simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.id; }))
          .force("charge", d3.forceManyBody())
          .force("center", d3.forceCenter(width / 2, height / 2));
      node = svg.append("g").selectAll(".node");
      link = svg.append("g").selectAll(".link");
      d3.json("data/miserables.json", function(error, data) {
        graphOriginal = data;
        callback();  
      })
      
    }
    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    }

    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    var update = function(data){
        var graph = data || graphOriginal;
        link = link.data(graph.links);
        link.exit().remove();
        link = link.enter()
                    .append("line")
                    .attr("stroke-width", function(d) { return Math.sqrt(d.value); })
                    .merge(link);

        node = node.data(graph.nodes);
        node.exit().remove();
        node = node.enter()
            .append("circle")
            .attr("r", 5)
            .attr("fill", function(d) { return color(d.group); })
            .merge(node)
            .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

        simulation
            .nodes(graph.nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(graph.links);

        simulation.alpha(1).restart()
    }
    return {
      init : setup,
      update : update,

      /** Never really exposing the original data at any point
      **/
      numNodesLinks : function(){
        return [graphOriginal.nodes.length,graphOriginal.links.length];
      },

      /**
      * Calculate the number of new nodes and also the links corresponding
      * As of now its just basic removing a fixed number of nodes and then removing 
      * the associated links. We can also probably selectively find nodes which have less links
      * and remove them first.
      **/
      updateNodes : function(num){
        var newNodes = graphOriginal.nodes.slice(0,num);
        var nodeIdsPresent = newNodes.map(function(d){
          return d.id;
        });
        var newLinks = [];
        graphOriginal.links.forEach(function(item){
          if(nodeIdsPresent.indexOf(item.source.id)>-1 && nodeIdsPresent.indexOf(item.target.id)>-1){
            newLinks.push(item);
          }
        });
        update({
          "nodes" : newNodes,
          "links" : newLinks
        });
        Slider.updateLinkSlider(newLinks.length);
      },

      /**
      * Calculate the number of new link and also the nodes corresponding
      * As of now its just basic removing a fixed number of links and then removing 
      * disasscociated nodes. We can also probably selectively find nodes with more than one links
      * and remove those links only.
      **/
      updateLinks : function(num){
        var newLinks = graphOriginal.links.slice(0,num);
        var nodesWithLinks = [];
        newLinks.forEach(function(item){
          if(nodesWithLinks.indexOf(item.source.id)==-1){
            nodesWithLinks.push(item.source.id);
          }
          if(nodesWithLinks.indexOf(item.target.id)==-1){
            nodesWithLinks.push(item.target.id);
          }
        });
        var newNodes = [];
        graphOriginal.nodes.forEach(function(item){
          if(nodesWithLinks.indexOf(item.id)>-1){
            newNodes.push(item);
          }
        });
        update({
          "nodes" : newNodes,
          "links" : newLinks
        })
        Slider.updateNodeSlider(newNodes.length);
      }
    }
})();

ForceLayout.init(function(){
  ForceLayout.update();  
  Slider.init();
});
