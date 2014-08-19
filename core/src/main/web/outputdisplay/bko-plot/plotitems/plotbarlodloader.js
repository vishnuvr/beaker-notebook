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
  var retfunc = function(plotUtils, PlotSampler, PlotBar, PlotLodBox) {
    var PlotBarLodLoader = function(data, lodthresh){
      this.datacopy = {};
      _(this.datacopy).extend(data);  // save for later use
      _(this).extend(data); // copy properties to itself
      this.lodthresh = lodthresh;
      this.format(lodthresh);
    };
    // class constants
    PlotBarLodLoader.prototype.lodTypes = ["box"];
    PlotBarLodLoader.prototype.lodSteps = [10];

    PlotBarLodLoader.prototype.format = function() {
      // create plot type index
      this.lodTypeIndex = 0;
      this.lodType = this.lodTypes[this.lodTypeIndex]; // line, box
      // create the two plotters
      this.plotter = new PlotBar(this.datacopy);
      this.lodplotter = new PlotLodBox(this.datacopy);
      this.lodplotter2 = new PlotLodBox(this.datacopy);

      // a few switches and constants
      this.isLodItem = true;
      this.lodOn = false;
      this.lodAuto = true;
      this.sampleStep = -1;
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }

      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op" : this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray,
        "d" : ""
      };
      this.elementProps = [];
    };

    PlotBarLodLoader.prototype.zoomLevelChanged = function(scope) {
      this.sampleStep = -1;
      this.lodplotter.zoomLevelChanged(scope);  // pass message to lod plotter
    };

    PlotBarLodLoader.prototype.switchLodType = function(scope) {
      this.lodTypeIndex = (this.lodTypeIndex + 1) % this.lodTypes.length;
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.clear(scope);

      if (this.lodType === "line") {
        this.lodplotter = new PlotLodLine(this.datacopy);
      } else if (this.lodType === "box") {
        this.lodplotter = new PlotLodBox(this.datacopy);
      }
    };

    PlotBarLodLoader.prototype.toggleAuto = function(scope) {
      this.lodAuto = !this.lodAuto;
      this.clear(scope);
    };

    PlotBarLodLoader.prototype.toggleLod = function(scope) {
      if (this.lodType === "off") {
        this.lodType = this.lodTypes[this.lodTypeIndex];
      } else {
        this.lodType = "off";
      }
      this.clear(scope);
    };

    PlotBarLodLoader.prototype.render = function(scope){
      if (this.shown === false) {
        this.clear(scope);
        return;
      }

      this.filter(scope);

      var lod = false;
      if (this.lodType !== "off") {
        if ( (this.lodAuto === true && this.vlength > this.lodthresh) || this.lodAuto === false) {
          lod = true;
        }
      }

      if (this.lodOn != lod) {
        scope.legendDone = false;
        this.clear(scope);
      }
      this.lodOn = lod;

      if (this.lodOn === false) {
        this.plotter.render(scope);
      } else {
        this.sample(scope);
        this.lodplotter.render(scope, this.elementSamples);
        this.lodplotter2.render(scope, this.elementSamples2);
      }
    };

    PlotBarLodLoader.prototype.getRange = function(){
      return this.plotter.getRange();
    };

    PlotBarLodLoader.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      this.plotter.applyAxis(xAxis, yAxis);
      // sampler is created AFTER coordinate axis remapping
      this.createSampler();
    };

    PlotBarLodLoader.prototype.createSampler = function() {
      var xs = [], ys = [], y2s = [];
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        xs.push( (ele.x + ele.x2) / 2 );
        ys.push(ele.y);
        y2s.push(ele.y2);
      }
      this.sampler = new PlotSampler(xs, ys);
      this.sampler2 = new PlotSampler(xs, y2s);
    };

    PlotBarLodLoader.prototype.filter = function(scope) {
      this.plotter.filter(scope);
      this.vindexL = this.plotter.vindexL;
      this.vindexR = this.plotter.vindexR;
      this.vlength = this.plotter.vlength;
    };

    PlotBarLodLoader.prototype.sample = function(scope) {
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var xl = scope.focus.xl, xr = scope.focus.xr;

      if (this.sampleStep === -1) {
        var pixelWidth = scope.stdmodel.initSize.width;
        var count = Math.ceil(pixelWidth / this.lodSteps[this.lodTypeIndex]);
        var s = (xr - xl) / count;
        this.sampleStep = s;
      }

      var step = this.sampleStep;
      xl = Math.floor(xl / step) * step;
      xr = Math.ceil(xr / step) * step;

      this.elementSamples = this.sampler.sample(xl, xr, this.sampleStep);
      this.elementSamples2 = this.sampler2.sample(xl, xr, this.sampleStep);
    };

    PlotBarLodLoader.prototype.createTip = function(ele) {
      if (this.lodOn === false) {
        return this.plotter.createTip(ele);
      }
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var valxl = plotUtils.getTipStringPercent(ele.xl, xAxis, 6),
          valxr = plotUtils.getTipStringPercent(ele.xr, xAxis, 6),
          valmin = plotUtils.getTipStringPercent(ele.min, yAxis),
          valmax = plotUtils.getTipStringPercent(ele.max, yAxis),
          valavg = plotUtils.getTipStringPercent(ele.avg, yAxis);
      var tip = {};
      if (this.legend != null) {
        tip.title = this.legend + " (sample)";
      }
      tip.xl = valxl;
      tip.xr = valxr;
      tip.min = valmin;
      tip.max = valmax;
      tip.avg = valavg;
      return plotUtils.createTipString(tip);
    };

    PlotBarLodLoader.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).remove();
      this.plotter.clearTips(scope);
      this.lodplotter.clearTips(scope);
      this.lodplotter2.clearTips(scope);
    };

    return PlotBarLodLoader;
  };
  beaker.bkoFactory('PlotBarLodLoader',
    ['plotUtils', 'PlotSampler', 'PlotBar', 'PlotLodBox', retfunc]);
})();