/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils) {
    var PlotConstline = function(data){
      _(this).extend(data); // copy properties to itself
      this.format();
    };

    PlotConstline.prototype.plotClass = "plot-constline";

    PlotConstline.prototype.format = function(){
      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op": this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray
      };

      this.elementProps = [];
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        var line = {
          "id" : this.id + "_" + i,
          "lbid" : this.id + "_" + i + "l",
          "st" : ele.color,
          "st_op" : ele.color_opacity,
          "st_w" : ele.width,
          "st_da" : ele.stroke_dasharray,
          "bg_clr" : ele.color == null ? this.color : ele.color
        };
        this.elementProps.push(line);
      }
    };

    PlotConstline.prototype.render = function(scope){
      if (this.shown === false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    PlotConstline.prototype.getRange = function() {
      var eles = this.elements;
      var range = {
        xl : 1E100,
        xr : -1E100,
        yl : 1E100,
        yr : -1E100
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        if (ele.type === "x") {
          range.xl = Math.min(range.xl, ele.x);
          range.xr = Math.max(range.xr, ele.x);
        } else if (ele.type === "y") {
          range.yl = Math.min(range.yl, ele.y);
          range.yr = Math.max(range.yr, ele.y);
        }
      }
      return range;
    };

    PlotConstline.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        if (ele.type === "x") {
          ele.x = xAxis.getPercent(ele.x);
        } else if (ele.type === "y") {
          ele.y = yAxis.getPercent(ele.y);
        }
      }
    };

    PlotConstline.prototype.filter = function(scope) {
      // do nothing and show everything
      var l = 0, r = this.elements.length - 1;
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };


    PlotConstline.prototype.prepare = function(scope) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var lMargin = scope.layout.leftLayoutMargin,
          bMargin = scope.layout.bottomLayoutMargin;
      var W = scope.jqsvg.width(),
          H = scope.jqsvg.height();

      this.pipe = [];
      this.labelpipe = [];
      this.rmlabelpipe = [];

      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];

        this.pipe.push(eleprops[i]);
        // does not need range assert, clipped directly

        if (ele.type === "x") {
          if (ele.x < focus.xl || ele.x > focus.xr) {
            this.rmlabelpipe.push(i);
            continue;
          } else {
            this.labelpipe.push(i);
          }
          var x = mapX(ele.x);
          _(eleprops[i]).extend({
            "id" : this.id + "_" + i + "l",
            "x1" : x,
            "x2" : x,
            "y1" : mapY(focus.yl),
            "y2" : mapY(focus.yr),
          });

          var text = plotUtils.getTipString(ele._x, scope.stdmodel.xAxis);

          _(eleprops[i]).extend({
            "left" : function(w, h) { return x - w / 2; },
            "top" : function(w, h) { return H - bMargin - h - scope.labelPadding.y; },
            "lb_txt" : text
          });

        } else if (ele.type === "y") {
          if (ele.y < focus.yl || ele.y > focus.yr) {
            this.rmlabelpipe.push(i);
            continue;
          } else {
            this.labelpipe.push(i);
          }
          var y = mapY(ele.y);
          _(eleprops[i]).extend({
            "id" : this.id + "_" + i + "l",
            "x1" : mapX(focus.xl),
            "x2" : mapX(focus.xr),
            "y1" : y,
            "y2" : y,
          });
          var text = plotUtils.getTipString(ele._y, scope.stdmodel.yAxis);

          _(eleprops[i]).extend({
            "left" : function(w, h) { return lMargin + scope.labelPadding.x; },
            "top" : function(w, h) { return y - h / 2; },
            "lb_txt" : text
          });
        }
      }
    };


    PlotConstline.prototype.draw = function(scope) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps,
          pipe = this.pipe;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; })
          .attr("class", this.plotClass)
          .style("stroke", function(d) { return d.st; })
          .style("stroke-opacity", function(d) { return d.st_op; })
          .style("stroke-width", function(d) { return d.st_w; })
          .style("stroke-dasharray", function(d) { return d.st_da; });
      }

      var svgitem = svg.select("#" + this.id);
      svgitem.selectAll("line")
        .data(pipe, function(d) { return d.id; }).exit().remove();
      svgitem.selectAll("line")
        .data(pipe, function(d) { return d.id; }).enter().append("line")
        .attr("id", function(d) { return d.id; })
        //.attr("class", this.respClass) // does not need resp
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-width", function(d) { return d.st_w; })
        .style("stroke-dasharray", function(d) { return d.st_da; });
      svgitem.selectAll("line")
        .data(pipe, function(d) { return d.id; })
        .attr("x1", function(d) { return d.x1; })
        .attr("x2", function(d) { return d.x2; })
        .attr("y1", function(d) { return d.y1; })
        .attr("y2", function(d) { return d.y2; });

      // add and remove labels
      for (var i = 0; i < this.labelpipe.length; i++) {
        var props = eleprops[i], lbid = props.lbid;

        var box = scope.jqcontainer.find("#" + lbid);
        if (box.empty()) {
          box = $("<div id=" + lbid + " class='plot-constlabel'></div>")
            .appendTo(scope.jqcontainer)
            .css("background-color", props.bg_clr)
            .text(props.lb_txt);
        }
        var w = box.outerWidth(), h = box.outerHeight();
        box.css({
          "left" : props.left(w, h),
          "top" : props.top(w, h)
        });
      }

      for (var i = 0; i < this.rmlabelpipe.length; i++) {
        scope.jqcontainer.find("#" + eleprops[i].lbid).remove();
      }

    };

    PlotConstline.prototype.clear = function(scope) {
      var eleprops = this.elementProps;
      scope.maing.select("#" + this.id).remove();
      for (var i = 0; i < this.elements.length; i++) {
        scope.jqcontainer.find("#" + eleprops.lbid).remove();
      }
    };

    return PlotConstline;
  };
  beaker.bkoFactory('PlotConstline', ['plotUtils', retfunc]);
})();