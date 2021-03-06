define(["draggable/avalon.draggable", "text!./avalon.colorpicker.html", "css!./avalon.colorpicker.css"], function(avalon, sourceHTML){

	var vm_temp = {};	//记录前一个被打开的ctr
	
	var widget = avalon.ui.colorpicker = function(element, data, vmodels){
		var vmodel = avalon.define(data.colorpickerId, function(vm){

			//初始化
			var	//控件固定信息
				o_offset = 97,	//原点于控件中的偏移量
				r = 84,			//圆环半径
				overlay_w = 100,//overlay宽度
				
				//hsl颜色表示所需参数
				h,				//h = angle - 0.25, h ∈ [0, 1)
				s,				//s ∈ [0, 1]
				l,				//l ∈ [0, 1]

				$element = avalon(element),
				cp,
				$wheel,
				$overlay;

			vm.$skipArray = ["auto_hide"];

			//marker坐标
			vm.wheel_m = {
				left: 0,
				top: 0
			};
			vm.overlay_m = {
				left: 0,
				top: 0
			};

			// 如果用户未设置颜色，设置初始颜色
			if(!("ms-duplex" in $element[0].msData)){
				element.setAttribute("ms-duplex", "default_color");
			}
			vm.cp_color = "";			//最终颜色
			vm.input_color = "";		//input字体颜色
			vm.hue_color = "";			//overlay背景色，s=1, l=0.5

			vm.toggle = false;

			avalon.mix(vm, data.colorpickerOptions);

			vm.$init = function(){
				
				renderView();
				//颜色初始化
				vm.setByIp(element.value);

			};
			vm.$remove = function(){
				cp.innerHTML = "";
				avalon.unbind(document, "click", docClickHandler);
			};

			vm.setByIp = function(val){
				if(val !== vm.cp_color){			//阻止从ctr改变element.value时触发函数

					if(isHexColorValid(val)){
						var r = parseInt(val.substr(1, 2), 16),
							g = parseInt(val.substr(5, 2), 16),
							b = parseInt(val.substr(3, 2), 16);
						
						h = rgbToHsl(r, g, b)[0];
						s = rgbToHsl(r, g, b)[1];
						l = rgbToHsl(r, g, b)[2];
						
						//h to angle
						var angle = 2*Math.PI*(h + 0.25);
						//s,l to left,top
						var overlay_m_left = (1 - s)*overlay_w,
							overlay_m_top = (1 - l)*overlay_w;

						setWheelMarkerPos(angle);
						setOverlayMarkerPos(overlay_m_left, overlay_m_top);

						setOverlayBg();
						vm.cp_color = val;
						vm.input_color = l > 0.5 ? "black" : "white";
					}
				}
			};

			vm.wheelDragStart = function(mouse_event, data){
				//禁止默认坐标修改
				data.dragX = false;
				data.dragY = false;
				//设置marker坐标：快速调节
				wheelDragFn(mouse_event);
			};
			vm.wheelDrag = function(mouse_event){
				//设置marker坐标：拖拽调节
				wheelDragFn(mouse_event);
			};
			vm.overlayDragStart = function(mouse_event, data){
				//禁止默认坐标修改
				data.dragX = false;
				data.dragY = false;
				//设置marker坐标：快速调节
				overlayDrag(mouse_event);
			};
			vm.overlayDrag = function(mouse_event){
				//设置marker坐标：拖拽调节
				overlayDrag(mouse_event);
			};

			vm.ipClick = function(e){
				vm.toggle = true;
				showCp();
				//如果当前打开的vm与前一个不同
				if(vm !== vm_temp){
					vm_temp.toggle = false;
					vm_temp = vm;
				}
				e.stopPropagation();
			};
			vm.cpClick = function(e){
				e.stopPropagation();
			};

			function wheelDragFn(mouse_event){
				
				//鼠标角度（极坐标系）的绝对值
				var angle = getAngle();
				//angle to h: 计算hsl中角度h，范围：[0, 1]
				h = angle/(2*Math.PI) - 0.25;

				setWheelMarkerPos(angle);

				//改颜色
				setOverlayBg();
				setCtrBg();

				function getAngle(){

					/*
					 * 重复绘制坐标系建立坐标的原因：
					 * 避免用户在拖拽的过程中滚动页面导致坐标紊乱
					 */

					//原点坐标
					var o_pos_x = $wheel.offset().left + o_offset,
						o_pos_y = $wheel.offset().top + o_offset,
					//鼠标相对原点坐标
						mouse_pos_x = mouse_event.pageX - o_pos_x,
						mouse_pos_y = o_pos_y - mouse_event.pageY,
					//角度
						angle = Math.atan(mouse_pos_y/mouse_pos_x);

					if(mouse_pos_x < 0){
						angle = Math.PI + angle;
					}

					return angle;
				}

			}
			function setWheelMarkerPos(angle){
				//marker坐标（二维坐标系）
				var marker_pos = {
					x: Math.round(r * Math.cos(angle)),
					y: Math.round(r * Math.sin(angle))
				};
				
				//设置marker坐标（css）
				vm.wheel_m.left = o_offset + marker_pos.x;
				vm.wheel_m.top = o_offset - marker_pos.y;
			}
			function overlayDrag(mouse_event){

				/*
				 * 重复绘制坐标系建立坐标的原因：
				 * 避免用户在拖拽的过程中滚动页面导致坐标紊乱
				 */

				//鼠标在overlay中坐标，原点为overlay左上角
				var mouse_pos = {
					x: mouse_event.pageX - $overlay.offset().left,
					y: mouse_event.pageY - $overlay.offset().top
				};
				
				//marker坐标（css）
				var overlay_m_left = getMarkerPos(mouse_pos.x),
					overlay_m_top = getMarkerPos(mouse_pos.y);

				setOverlayMarkerPos(overlay_m_left, overlay_m_top);
				
				//计算hsl中的s和l，范围[0, 1]
				s = 1 - overlay_m_left/overlay_w;
				l = 1 - overlay_m_top/overlay_w;

				setCtrBg();

				function getMarkerPos(num){
					if(num < 0){
						return 0;
					}
					if(num > overlay_w){
						return overlay_w;
					}
					return num;
				}
			}
			function setOverlayMarkerPos(left, top){
				//设置marker坐标（css）
				var overlay_m = vm.overlay_m;
				
				overlay_m.left = left;
				overlay_m.top = top;

			}
			
			
			function setOverlayBg(){
				vm.hue_color = getColor(h, 1, 0.5);
			}
			function setCtrBg(){
				element.value = vm.cp_color = getColor(h, s, l);
				vm.input_color = l > 0.5 ? "black" : "white";
			}

			function renderView(){

				//render input
				element.setAttribute("ms-css-background", "cp_color");
				element.setAttribute("ms-css-color", "input_color");
				element.setAttribute("data-duplex-changed", "setByIp");

				//render colorpicker
				var dom_arr = sourceHTML.split("MS_OPTION_COM").map(function(item){
						return avalon.parseHTML(item).firstChild;
					}),
					cp_hue = dom_arr[1],
					cp_wheel = dom_arr[2],
					cp_overlay = dom_arr[3];

				cp = dom_arr[0];

				$wheel = avalon(cp_wheel),
				$overlay = avalon(cp_overlay);

				//构建cp
				cp.appendChild(cp_hue);
				cp.appendChild(cp_wheel);
				cp.appendChild(cp_overlay);
				
				//构建colorpicker
				//自动隐藏
				if(vm.auto_hide){

					avalon(cp).addClass("ui-colorpicker-auto-hide");
					
					cp.setAttribute("ms-visible", "toggle");
					cp.setAttribute("ms-click", "cpClick");
					element.setAttribute("ms-click", "ipClick");

					avalon.bind(document, "click", docClickHandler);

					document.body.appendChild(cp);

				}else{
					insertAfter(cp, element);
				}

				avalon.scan(element, [vmodel].concat(vmodels));
				avalon.scan(cp, [vmodel].concat(vmodels));
			};

			function showCp(){
				var input_pos = $element.offset();

				cp.style.left = input_pos.left + "px";
				cp.style.top = element.offsetHeight + input_pos.top + "px";
			}

			function docClickHandler(){
				vm.toggle = false;
			}
		});
		
		//avalon.scan();
		return vmodel;

	};

	widget.version = 1.0;
	widget.defaults = {
		auto_hide: true,
		default_color: "#ffffff"
	};

	function isHexColorValid(val){
		//正则匹配十六进制颜色表示
		var	reg = /#[0-9,a-f]{6}$/i;
		return reg.test(val);
	}
	function hslToRgb(h, s, l){

		var r, g, b;

		if(s == 0){
			r = g = b = l;
		}else{

			var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			var p = 2 * l - q;
			
			r = hueToRgb(p, q, h + 1/3);
			g = hueToRgb(p, q, h - 1/3);
			b = hueToRgb(p, q, h);
			
		}

		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];

		function hueToRgb(p, q, t){
			if(t < 0) t += 1;
			if(t > 1) t -= 1;
			if(t < 1/6) return p + (q - p) * 6 * t;
			if(t < 1/2) return q;
			if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			return p;
		}
	}
	function rgbToHsl(r, g, b){
		r /= 255, g /= 255, b /= 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, l = (max + min) / 2;

		if(max == min){
			h = s = 0; // achromatic
		}else{
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch(max){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}

		return [h, s, l];
	}
	function getColor(h, l, s){
		return rgbToText(hslToRgb(h, l, s));
	}
	function rgbToText(rgb){
		return "#" + rgb.map(toHex).join("");

		function toHex(num){
			if(num < 16){
				return "0" + num.toString(16);
			}
			return num.toString(16);
		}
	}

	function insertAfter(newEl, targetEl){
		var parentEl = targetEl.parentNode;
		if(parentEl.lastChild == targetEl){
			parentEl.appendChild(newEl);
		}else{
			parentEl.insertBefore(newEl, targetEl.nextSibling);
		}
	}

	return avalon;
});