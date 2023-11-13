import {
  Component,
  OnInit,
  Input,
  SimpleChanges,
  OnChanges,
} from '@angular/core';

// D3
import * as d3 from 'd3';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from 'd3-force';
import { scaleLog } from 'd3-scale';

import * as uuid from 'uuid';
import * as d3SvgToPng from 'd3-svg-to-png';
import { FishService } from './fish.service';
type Link = {
  index?: number;
  depth?: number; // Might not be undefined
  arrow?: boolean;
  source?: unknown;
  target?: unknown;
};
type Connector = {
  between: (Node | Connector)[];
  childIdx?: number;
  index?: number;
  maxChildIdx?: number;
  totalLinks: Link[];
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type Node = {
  index?: number;
  childIdx?: number;
  depth?: number;
  horizontal?: boolean;
  linkCount?: number;
  name: string;
  parent?: Node;
};
@Component({
  selector: 'app-fish',
  templateUrl: './fish.component.html',
  styleUrls: ['./fish.component.scss'],
})
export class FishComponent implements OnInit, OnChanges {
  @Input()
  data: any;
  wrapperStyle = {
    width: '100%',
    height: 500,
  };
  linesConfig = [
    {
      color: '#000',
      strokeWidthPx: 2,
    },
    {
      color: '#333',
      strokeWidthPx: 1,
    },
    {
      color: '#666',
      strokeWidthPx: 0.5,
    },
  ];

  nodesConfig = [
    {
      color: '#000',
      fontSizeEm: 2,
    },
    {
      color: '#111',
      fontSizeEm: 1.5,
    },
    {
      color: '#444',
      fontSizeEm: 1,
    },
    {
      color: '#888',
      fontSizeEm: 0.9,
    },
    {
      color: '#aaa',
      fontSizeEm: 0.8,
    },
  ];
  svg: any;
  force: any;
  root: any;
  node: any;
  drag: any;
  // linkScale
  link: any;

  margin = 100;

  nodes = new Array<any>();
  links = new Array<any>();
  width = '100%';
  height = '100%';
  svgWidth = () => {
    return this.width;
  };
  svgHeight = () => {
    return this.height;
  };
  arrowElementId = '#arrow';
  constructor(private svc: FishService) {
    this.svc.restartRequest$.subscribe((req: boolean) => {
      if (req) {
        this.restart();
      }
    });
  }

  ngOnInit(): void {
    this.drag = d3.drag().on('drag', this.dragged).on('start', this.dragstart);

    this.force = forceSimulation(this.nodes)
      .force('charge', forceManyBody().strength(-10))
      .force('collision', forceCollide(15))
      .force(
        'link',
        forceLink()
          .id((d: any) => d.id)
          .links(this.links)
          .distance(
            (d: any) => (d.target.maxChildIdx + 1) * this.linkDistance(d.depth)
          )
      )
      // .force('link', forceLink(this.links).distance(this.linkDistance))
      .on('end', () => this.simulationDone())
      .on('tick', this.tick);
  }

  ngOnChanges(changes: SimpleChanges) {
    // check if "data" input has changed
    if (changes['data']) {
      // Se inicializa el svg junto con sus puntas
      if (!this.svg) {
        /* TODO: A more angular way to do this is to use a ViewChild. */
        this.svg = d3
          .select('#d3Container')
          .append('svg')
          .attr('width', this.width)
          .attr('height', this.height)
          .datum(this.data)
          .call(this.defaultArrow);
      }
      this.nodes = [];
      this.links = [];
      if (changes['data'].currentValue === null) {
        this.clear();
      } else {
        this.buildNodes(this.svg.datum());
        this.restart();
      }
    }
  }

  clear() {
    this.svg.remove();
    this.node.remove();
    this.link.remove();
    this.root.remove();
    this.nodes = [];
    this.links = [];
    this.force.nodes(this.nodes);
  }

  restart() {
    this.setupNodes();
    if (this.force) {
      this.force.stop(); // this is just in case. ideally, the force system either doesn't exist here or is already stopped.
      this.force.nodes(this.nodes, (d: any) => {
        return d.uuid;
      });
      this.force.force(
        'link',
        forceLink(this.links).distance(this.linkDistance)
      );
      this.force.alpha(1).restart();
    }
  }

  setupNodes() {
    /* setup the nodes */
    this.node = this.svg
      .selectAll('.node')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('class', (d: any) => `node ${d.root ? 'root' : ''}`)
      .append('text')
      .attr('class', (d: Node) => `label-${d.depth}`)
      .style('font-size', (d: Node) => {
        const size = this.getNodeConfigWithoutOverflow(d.depth).fontSizeEm;
        return `${size}em`;
      })
      .style('fill', (d: Node) => {
        return this.getNodeConfigWithoutOverflow(d.depth).color;
      })
      .attr('text-anchor', (d: Node) =>
        !d.depth ? 'start' : d.horizontal ? 'end' : 'middle'
      )
      .attr('dy', (d: any) =>
        d.horizontal ? '.35em' : d.region === 1 ? '1em' : '-.2em'
      )
      .text((d: Node) => d.name)
      .classed('node', true)
      .classed('fixed', (d: any) => d.fx !== undefined)
      .call(this.drag)
      .on('click', this.click);
    /* setup the links */
    this.link = this.svg
      .selectAll('.link')
      .data(this.links)
      .enter()
      .append('line')
      .attr('class', (d: any) => `link link-${d.depth}`)
      .attr('marker-end', (d: any) =>
        d.arrow ? `url(${this.arrowElementId})` : null
      )
      .style('stroke', (d: Link) => {
        return this.getLineConfigWithoutOverflow(d.depth).color;
      })
      .style('stroke-width', (d: Link) => {
        const width = this.getLineConfigWithoutOverflow(d.depth).strokeWidthPx;
        return `${width}px`;
      });
    this.svg
      .selectAll('text')
      .attr('class', (d: any) => 'label-' + d.depth)
      .attr('text-anchor', (d: any) => {
        return !d.depth ? 'start' : d.horizontal ? 'end' : 'middle';
      })
      .attr('dy', (d: any) => {
        return d.horizontal ? '.35em' : d.region === 1 ? '1em' : '-0.2em';
      })
      .text((d: any) => {
        return d.name;
      });

    this.svg.selectAll('text').call(this.wrap, 100);

    this.node.exit().remove();

    this.link.exit().remove();

    this.root = d3.select('.root').node();
  }

  /**
   *  buildNodes is a function to rebuild the node list and pad all the nodes with layout directives.
   *  For the layout and forces to work properly, we use a variety of node properties like horizontal,
   *  vertical, region, depth, tail among others.
   * */
  buildNodes(node: any) {
    this.nodes.push(node);
    let cx = 0;
    let between = [node, node.connector];
    const nodeLinks = [
      {
        source: node,
        target: node.connector,
        arrow: true,
        depth: node.depth || 0,
      },
    ];

    let prev: any;
    let childLinkCount;

    if (!node.parent) {
      // this.nodes.push((prev = {tail: true, uuid: uuid.v4()}));
      this.nodes.push((prev = { tail: true, uuid: uuid.v4() }));
      between = [prev, node];
      nodeLinks[0].source = prev;
      nodeLinks[0].target = node;
      node.horizontal = true;
      node.vertical = false;
      node.depth = 0;
      node.root = true;
      node.totalLinks = [];
    } else {
      node.connector.maxChildIdx = 0;
      node.connector.totalLinks = [];
    }

    node.linkCount = 1;

    (node.children || []).forEach((child: any, idx: number) => {
      child.parent = node;
      child.depth = (node.depth || 0) + 1;
      child.childIdx = idx;
      child.region = node.region ? node.region : idx & 1 ? 1 : -1;
      child.horizontal = !node.horizontal;
      child.vertical = !node.vertical;

      if (node.root && prev && !prev.tail) {
        this.nodes.push(
          (child.connector = {
            between: between,
            childIdx: prev.childIdx,
            uuid: uuid.v4(),
          })
        );
        prev = null;
      } else {
        this.nodes.push(
          (prev = child.connector =
            {
              between: between,
              childIdx: cx++,
              // uuid: uuid.v4(),
            })
        );
      }

      nodeLinks.push({
        source: child,
        target: child.connector,
        depth: child.depth,
        arrow: true,
      });

      childLinkCount = this.buildNodes(child);
      node.linkCount += childLinkCount;
      between[1].totalLinks.push(childLinkCount);
    });

    between[1].maxChildIdx = cx;

    Array.prototype.push.apply(this.links, nodeLinks);

    return node.linkCount;
  }

  tick() {
    const alpha = this.force.alpha();

    const k = 6 * (alpha || 0);
    const width: any = this.svgWidth();
    const height: any = this.svgHeight();
    const margin = this.margin;
    let a;
    let b;
    const root = this.root;
    this.nodes.forEach(function (d) {
      if (d.root) {
        d.x = width - (margin + root.getBBox().width);
      }
      if (d.tail) {
        d.x = margin;
        d.y = height / 2;
      }

      if (d.depth === 1) {
        d.y = d.region === -1 ? margin : height - margin;
        d.x -= 10 * k;
      }

      if (d.vertical) {
        d.y += k * d.region;
      }

      if (d.depth) {
        d.x -= k;
      }

      if (d.between) {
        a = d.between[0];
        b = d.between[1];

        d.x = b.x - ((1 + d.childIdx) * (b.x - a.x)) / (b.maxChildIdx + 1);
        d.y = b.y - ((1 + d.childIdx) * (b.y - a.y)) / (b.maxChildIdx + 1);
      }
    });

    this.node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    this.link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);
  }

  defaultArrow(svg: any) {
    /* creates an svg:defs and marker with an arrow if needed...
         really just an example, as they aren't very flexible */
    var defs = svg.selectAll('defs').data([1]);

    defs.enter().append('defs');

    /* create the arrows */
    svg
      .selectAll('marker#arrow')
      .data([1])
      .enter()
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5');
  }

  linkDistance(l: any) {
    const linkScale = scaleLog().domain([1, 5]).range([60, 40]);
    return (l.target.maxChildIdx + 1) * linkScale(l.depth + 1);
  }

  nodeClicked(d: any, i: any) {
    if (this.force) {
      this.force.stop();
    }
  }

  downloadImage() {
    d3SvgToPng.default('svg', 'fishboneDiagram', {
      download: true,
      format: 'png',
    });
  }

  simulationDone() {
    console.info('layout complete.');
    console.log(
      this.nodes.length + ' nodes and ' + this.links.length + ' links'
    );
  }

  /*
   * text wrap function for use with SVG.
   * https://bl.ocks.org/mbostock/7555321
   */
  wrap(selectionList: any, width: number) {
    selectionList.each(function (selection: any, idx: number, selList: any) {
      let text = selection.name;
      let domNode = d3.select(selList[idx]);
      let dy = parseFloat(domNode.attr('dy'));
      let y = domNode.attr('y');
      let words: Array<string> = [];
      if (text) {
        words = text.split(/\s+/).reverse();
      }
      let word: string | undefined;
      let line: Array<string> = [];
      let lineNumber = 0;
      // let lineHeight = calculatePosition(selection.depth, selection.region, lineNumber);
      let tspan = domNode
        .text(null)
        .append('tspan')
        .attr('x', 0)
        .attr('y', y)
        .attr('dy', `${dy}em`);
      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(' '));
        let tspanNode = tspan.node();
        let t = line.join(' ');
        if (tspanNode && tspanNode.getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          let _dy = calculatePosition(
            selection.depth,
            selection.region,
            ++lineNumber
          );
          tspan = domNode
            .append('tspan')
            .attr('x', 0)
            .attr('y', y)
            .attr('dy', `${_dy}em`)
            .text(word);
        }
      }
    });
  }

  // lineConfigWithoutOverflow
  getLineConfigWithoutOverflow(index: number | undefined) {
    if (!index || index < 0) return this.linesConfig[0];

    const maxIndex = this.linesConfig.length - 1;

    return this.linesConfig[
      maxIndex ^ ((index ^ maxIndex) & -(index < maxIndex))
    ];
  }

  // nodeConfigWithoutOverflow
  getNodeConfigWithoutOverflow(index: number | undefined) {
    if (!index || index < 0) return this.nodesConfig[0];

    const maxIndex = this.nodesConfig.length - 1;

    return this.nodesConfig[
      maxIndex ^ ((index ^ maxIndex) & -(index < maxIndex))
    ];
  }

  clamp(x: any, lo: any, hi: any) {
    return x < lo ? lo : x > hi ? hi : x;
  }

  click(event: any, d: any) {
    delete d.fx;
    delete d.fy;
    d3.select(event.target).classed('fixed', false);
    this.force?.alpha(1).restart();
  }
  dragstart = (event: any) => {
    d3.select(event.sourceEvent.target).classed('fixed', true);
  };

  dragged(event: any, d: any) {
    d.fx = this.clamp(event.x, 0, this.svgWidth());
    d.fy = this.clamp(event.y, 0, this.svgHeight());
    this.force?.alpha(1).restart();
  }
}

function calculatePosition(depth: number, region: number, lineNumber: number) {
  // at depth 1, for the top half, increment by one lineNumber;
  // let lh = 1;

  // console.log(`calculateLineHeight(depth: ${depth}, region: ${region}, lineNumber: ${lineNumber}) = ${lh}`);
  return 1;
}
