// Some DataSets are massive and will bring any web browser to its knees if you
// try to load the entire thing. To keep your app performing optimally, take
// advantage of filtering, aggregations, and group by's to bring down just the
// data your app needs. Do not include all columns in your data mapping file,
// just the ones you need.
//
// For additional documentation on how you can query your data, please refer to
// https://developer.domo.com/docs/dev-studio/dev-studio-data


controller();

function controller(){
	var nodeArray =[];
	var groupArray = [];
	var linkArray = [];

console.log("nodeArray length:", nodeArray.length)
if (nodeArray.length == 0) { // OPTIMISE: only read data if necessary
  console.log("Reading nodes");
	promiseNode = domo.get('/data/v1/nodes')
    .then(function(nodes){
      	nodes.forEach(function(node){
      		var nodeJSON = { key: node.metric,
														topText: node.text ? node.text : node.metric,
														actual: node.actual,
														target: node.target,
					                  achieved:Math.round((node.actual	 / node.target)*100) + '%',
														actionNumber:node.explanation_count, actionIcon: node.explanation_count > 0,
				                    cardID:node.card_id, chartVis: node.card_id ? true: false,
														pageID:node.page_id, pageVis: node.page_id ? true: false,
													  group:node.group};

					if (node.status === 'Alarm') { nodeJSON.sidebarColor = 'red';}
					else if (node.status === 'Warning') { nodeJSON.sidebarColor =  'yellow';}

      		nodeArray.push(nodeJSON);
      	})
			});

	console.log("Reading groups");
  promiseGroups = domo.get('/data/v1/groups')
	    .then(function(groups){
	      	groups.forEach(function(group){
	      		var groupJSON = { key: group.group, text: group.text,  group: group.parent, color: group.color, index:group.order, layerName: "Background", isGroup: true};
	      		groupArray.push(groupJSON);
	      	})
			});
					//console.log(groupArray);
  console.log("Reading links");
  promiseLink = domo.get('/data/v1/link')
		    .then(function(links){
		      // console.log("link", link);
		      	links.forEach(function(link){
		      		var linkJSON = { from: link.parent, to: link.child };
		      		if (link.islayoutpositioned == 'false'){
		      			linkJSON.isLayoutPositioned =  false;
		      		}

		      		linkArray.push(linkJSON);
		      	});
						//console.log(linkArray)

		    });


  Promise.all([promiseNode, promiseGroups, promiseLink])
				.then(function(){
					var treeArray = [];
					treeArray.push( groupArray.concat(nodeArray), linkArray);
					renderTree(treeArray);
				});
  }
};

function renderTree(treeArray){
	console.log("renderTree")
	//console.log(treeArray);

    var $ = go.GraphObject.make;  // for conciseness in defining templates

    myDiagram =
      $(go.Diagram, "myDiagramDiv",  // create a Diagram for the DIV HTML element
        {
          allowMove: false,  // Set falue so  user cannot move any nodes
					initialDocumentSpot: go.Spot.TopCenter,
          initialViewportSpot: go.Spot.TopCenter,
      //    initialAutoScale: go.Diagram.Uniform,  // initially the whole diagram fits in the viewport
          initialContentAlignment: go.Spot.Center,  // center the content
          layout:
            $(go.TreeLayout,
              {
                treeStyle: go.TreeLayout.StyleLastParents,
                arrangement: go.TreeLayout.ArrangementHorizontal,
                // properties for most of the tree:
                compaction: go.TreeLayout.CompactionNone,
                angle: 90,
                alignment: go.TreeLayout.AlignmentCenterSubtrees,
                layerSpacing: 80,
                nodeSpacing: 60,
                breadthLimit:0,
								sorting: go.TreeLayout.SortingAscending,
								comparer: function(a, b) {
                  // A and B are TreeVertexes
									//console.log(a.node.data.key + " vs " + b.node.data.key)
									var ga = a.node.containingGroup;
									var gb = b.node.containingGroup;
									if ( ga && gb ) {
	                  var av = ga.data.index;
	                  var bv = gb.data.index;
										//console.log(av + " vs "  + bv)
	                  if (av < bv) return -1;
	                  if (av > bv) return 1;
	                  return 0;
									}
									else return 0;
								},
                // properties for the "last parents":
                alternateAngle: 90,
                alternateAlignment: go.TreeLayout.AlignmentBus
              }),
          "LayoutCompleted": function(e) {
            var y = Infinity;
            var h = 0;
            e.diagram.findTopLevelGroups().each(function(g) {
              y = Math.min(y, g.actualBounds.y);
              h = Math.max(h, g.actualBounds.height);
            });
            e.diagram.findTopLevelGroups().each(function(g) {
              g.position = new go.Point(g.position.x, y);
              if (g.isSubGraphExpanded) { g.height = h;}
              else {g.height =  Infinity; }
            });
          },
          "undoManager.isEnabled": true  // enable undo & redo
        });

    myDiagram.nodeTemplate =
      $(go.Node, "Spot", { selectionAdorned: false },
      	{ click: function(e, node) { showConnections(node); } },
        $(go.Shape, "Rectangle", { strokeWidth: 1, fill: '#F8F9F9', stroke: 'grey', height: 75, width: 120  },
						new go.Binding("fill", "isSelected", function(h) { return h ? "#AFEEEE" : '#F8F9F9'; }).ofObject()),
        $(go.Shape, "Rectangle", { strokeWidth: 1, fill: 'SILVER' , stroke: 'grey',  height: 75, width: 7,
																			alignment: go.Spot.Left, alignmentFocus: go.Spot.Left },
          new go.Binding('fill', 'sidebarColor')),
        // Top text:
        $(go.TextBlock,
          { font: '12px sans-serif', isUnderline: false,
					   wrap: go.TextBlock.WrapDesiredSize, width:100, textAlign: "center",
					  alignment: go.Spot.Top, alignmentFocus: new go.Spot(0.5, 0.5, 0, 15) /* pushed down slightly */  },
          new go.Binding("text", "topText")),
        // Middle text table
        $(go.Panel, "Table",
          { padding: 0, alignment: new go.Spot(.5,.55,0,0)},
          $(go.TextBlock, new go.Binding("text", "actual"),
            { row: 0, column: 0,  margin: new go.Margin(0, 0, 0, 6), font: '12px sans-serif' }),
          $(go.TextBlock,"Actual",
            { row: 1, column: 0,  margin: new go.Margin(0, 0, 0, 6), font: '7px sans-serif', stroke:'grey' }),
          $(go.TextBlock, new go.Binding("text", "target"),
            { row: 0, column: 1,  margin: new go.Margin(0, 0, 0, 6), font: '12px sans-serif' }),
          $(go.TextBlock,"Target",
            { row: 1, column: 1,  margin: new go.Margin(0, 0, 0, 6), font: '7px sans-serif', stroke:'grey' }),
            $(go.TextBlock, new go.Binding("text", "achieved"),  new go.Binding('stroke', 'sidebarColor'),
            { row: 0, column: 2,  margin: new go.Margin(0, 0, 0, 6), font: '12px sans-serif' }),
          $(go.TextBlock,"Achieved",
            { row: 1, column: 2,  margin: new go.Margin(0, 0, 0, 6), font: '7px sans-serif', stroke:'grey' })
        	),

        // left icon
        $(go.Panel, "Spot",
          { alignment: new go.Spot(0, 1, 20, -10) }, // offset from the bottom left
          $(go.Shape, "circle",
            { visible: false, width: 13, height: 13, fill: 'red',  stroke: 'gray', strokeWidth: 0.5 },
             new go.Binding("visible", "actionIcon")),
          $(go.TextBlock,
            { font: '8px sans-serif', alignment: new go.Spot(0.6, 0.6,  0, 0),
						click: function (e, obj) {
	                var node = obj.part;
	                if (node === null) return;
	                e.handled = true;

									var filterValue = '"' + encodeURIComponent(node.data.key).replace(',','","') + '"';
									var actionURL = '/page/1654963323?pfilters=[{"column":"Metric","dataSourceId": "19ca6b6b-ea16-42cf-ac02-5a43aaad3a3d","dataType":"string","operand":"IN","values":[' + filterValue + ']}]'
									//console.log("navigate: ", actionURL);
									domo.navigate(actionURL, e.shift);
	              }
						}, new go.Binding("text", "actionNumber"))
        ),
				//middle
				$(go.Picture,
          { visible: false, alignment: new go.Spot(0.5, 1, 0, -10),
            width: 27, height: 16, source: "dashboard-icon.png",
						click: function (e, obj) {
									var node = obj.part;
									if (node === null) return;
									e.handled = true;

									//console.log("Click middle icon", e.shift)
									var cardURL = '/page/' + node.data.pageID;
								  domo.navigate(cardURL , e.shift);
									}
					}, new go.Binding("visible", "pageVis")),
        // right icon
        $(go.Picture,
          { visible: false, alignment: new go.Spot(1, 1, -20, -10),
            width: 20, height: 14, source: "chart-icon.png",
						click: function (e, obj) {
									var node = obj.part;
									if (node === null) return;
									e.handled = true;

									//console.log("Click right icon", e.shift)
									var cardURL = '/kpis/details/' + node.data.cardID;
								  domo.navigate(cardURL , e.shift);
									}
					}, new go.Binding("visible", "chartVis")),
      );

    myDiagram.linkTemplate =
      $(go.Link,
        { routing: go.Link.Orthogonal},
        new go.Binding('isLayoutPositioned'),
        new go.Binding("routing", "isLayoutPositioned", function(l)
        		{ return l ? go.Link.Orthogonal : go.Link.AvoidsNodes; }),
        $(go.Shape, { strokeWidth: 1.25, stroke: 'black'}),
        $(go.Shape, { fromArrow: 'Backward', scale: 1.25, fill: 'black', stroke: 'black'})
      );

    myDiagram.groupTemplate =
      $(go.Group, "Auto",
        {
          layout: null,
          locationSpot: go.Spot.Top,
          layoutConditions: go.Part.LayoutNone,
          selectable: false,
					layerName: "Background",
					//sorting: go.TreeLayout.SortingForwards,
					click: function(e, node) { clearHighlights(node);	}
        },
        new go.Binding("layout", "isSubGraphExpanded", function(e) { return e ? null : new go.Layout(); }).ofObject(),
        $(go.Shape, "Rectangle",
          { fill: "#D9EAD3", strokeWidth: 0.5 },
           new go.Binding('fill', 'color')),
        $(go.Panel, "Table",
          { alignment: go.Spot.Top },
          $(go.TextBlock,
            {
              row: 0, column: 0,
              font: "19px sans-serif",
              margin: new go.Margin(10, 0, 0, 10)
            },
            new go.Binding("text").makeTwoWay()),
          $("SubGraphExpanderButton",
            {
              row: 0, column: 1,
              alignment: go.Spot.TopRight,
              margin: new go.Margin(10, 10, 0, 0)
            }),
          $(go.Placeholder,  // represents where the members are -- i.e. the subtrees
            {
              row: 1, columnSpan: 2,
              padding: new go.Margin(5, 10, 10, 10),
              background: "transparent"
            })
        )
      );



			function highlightReachable(node) {
      	if (node != null && !node.isGroup) {
          node.isHighlighted = true;

          node.findLinksInto().each(function(l) { l.isHighlighted = true; });
          node.findNodesInto().each(highlightReachable);
        }
      }

      function showConnections(node) {
        myDiagram.startTransaction("highlight");
        // remove any previous highlighting
        myDiagram.clearHighlighteds();
        highlightReachable(node);
        myDiagram.nodes.each(function(n) { n.layerName = doHighlight(n)});
 			  myDiagram.links.each(function(l) { l.layerName = doHighlight(l) });
//	      if (node.containingGroup !== null) { node.containingGroup.layerName = "";}
        //myDiagram.findLayer("Foreground").opacity = 1;
				myDiagram.findLayer("").opacity = 0.35;
				//myDiagram.findLayer("Background").opacity = 1;
        myDiagram.commitTransaction("highlight");
      }

			function doHighlight(n) {
				if (n.data.isGroup) { return "Background"; } //Use data as a hack
				else if (n.isHighlighted) { return "Foreground" ;}
				else { return  "";}
			}

  		// when the user clicks on the background of the Diagram, remove all highlighting
      myDiagram.click = function(e, node) {clearHighlights(node)}

			function clearHighlights (n) {
  			//console.log("clearHighlights: " + n.key + " " + n.data.isGroup + " " + n.layerName);

        myDiagram.startTransaction("no highlighteds");

				myDiagram.clearHighlighteds();
				myDiagram.nodes.each(function(n) { n.layerName = doHighlight(n)});
 			  myDiagram.links.each(function(l) { l.layerName = doHighlight(l) });
        myDiagram.findLayer("").opacity = 1;
				myDiagram.commitTransaction("no highlighteds");
    	};
			myDiagram.findLayer("Foreground").opacity = 1;
			myDiagram.findLayer("Background").opacity = 1;



    // create the model data that will be represented by Nodes and Links
    myDiagram.model = new go.GraphLinksModel(treeArray[0],treeArray[1]);


    // initialize Overview
    myOverview =
      $(go.Overview, "myOverviewDiv",
        {
          observed: myDiagram,
          contentAlignment: go.Spot.Center
        })
  }

	// the Search functionality highlights all of the nodes that have at least one data property match a RegExp
function searchDiagram() {  // called by button
	var input = document.getElementById("SearchBox");
	if (!input) return;
	input.focus();

	myDiagram.startTransaction("highlight search");

	if (input.value) {
		// search four different data properties for the string, any of which may match for success
		// create a case insensitive RegExp from what the user typed
		var regex = new RegExp(input.value, "i");
		var results = myDiagram.findNodesByExample({ topText: regex });
		myDiagram.selectCollection(results);
		// try to center the diagram at the first node that was found
		if (results.count > 0) myDiagram.centerRect(results.first().actualBounds);
	} else {  // empty string only clears highlighteds collection
		myDiagram.clearSelection();
	}

	myDiagram.commitTransaction("highlight search");
}

function popupWindow(node) {
			if (node === null) return;

			var instance = 'https://sinarmas-agri-business.domo.com'
			var embedURL =  '/embed/card/' + node.data.cardID +'?enable="title,summary,drill,filter,picker,export"';
			console.log("navigate: ", embedURL);
			jQuery('.modal-content').html('<iframe src=' + instance + embedURL + ' width="100%" height="100%" marginheight="0" marginwidth="0" frameborder="0" scrolling="no"></iframe>');
			jQuery('.modal-content').modal('show');
			}
