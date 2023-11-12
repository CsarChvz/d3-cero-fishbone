import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import * as uuid from 'uuid';
import { TreeService } from './tree.service';
@Component({
  selector: 'app-tree',
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.scss'],
})
export class TreeComponent implements OnInit {
  treeLayout: any;
  root: any;
  nodes = new Array<any>();
  links = new Array<any>();
  svg: any;
  node: any;
  link: any;
  private data = {
    name: 'A1',
    children: [
      {
        name: 'B1',
        children: [
          {
            name: 'C1',
            value: 100,
          },
          {
            name: 'C2',
            value: 300,
          },
          {
            name: 'C3',
            value: 200,
          },
        ],
      },
      {
        name: 'B2',
        value: 200,
      },
    ],
  };

  constructor(private svc: TreeService) {
    this.svc.restartRequest$.subscribe((req: boolean) => {
      if (req) {
      }
    });
  }

  ngOnInit(): void {
    this.treeLayout = d3.tree().size([400, 200]);
    this.root = d3.hierarchy(this.data);
    this.treeLayout(this.root);
    this.svg = d3
      .select('tree')
      .append('svg')
      .attr('width', 500)
      .attr('height', 500);

    this.node = this.svg.selectAll('.node').data(this.nodes, (d: any) => {
      return d.id || (d.id = uuid.v4());
    });
  }
}
