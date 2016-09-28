// ==UserScript==
// @name           京东PC端自动下单
// @description    有货自动点击
// @include        http*://*trade.jd.com/*
// @author         ying
// @copyright      ying
// @version        0.1
// @grant  none
// @namespace https://github.com/fy1128/jd-autobuy-js
// ==/UserScript==

(function () {
	if (window.location.host.indexOf("trade.jd.com") == 0) {
		const JSONP = "jsonp";
		var allGoodsObjs, areaIds, venderId, skuid, oPrices, prices, stock, consigneeid, couponid;
		stock = {}; // 库存
		oPrices = {}; // 下单价格
		prices = {}; // 实时价格
		
		var getStock = function(dataType, skuid, stockFunc) {
			ajaxStock(dataType, skuid, stockFunc);
		}
		
		function ajaxStock(dataType, skuid, dtd) {
			var url = "//ss.jd.com/ss/areaStockState/mget?app=cart_pc&ch=1&skuNum="+skuid+",1&area="+areaIds.state_id+","+areaIds.city_id+","+areaIds.country_id+",0";
			var getStockAjaxDfd = $.Deferred();
			getStockAjax(url, getStockAjaxDfd);
			$.when(getStockAjaxDfd).then(function(data) {
				//检测库存，-1 表示库存>5，1表示库存<5，0表示无货
				if (33 == data[skuid].a) {
					if (-1 == data[skuid].c) {
						stock[skuid] = -1;
					} else {
						stock[skuid] = 1;
					}
				} else {
					stock[skuid] = 0;
				}
				dtd.resolve();
			}, function(xhr) {
				console.log('调用京东API获取库存数据失败！');
				return xhr.reject().promise();
			});
			
			function getStockAjax(url, dfd) {
				$.ajax({
					url: url,
					dataType: dataType,
					success: function(data) {
						dfd.resolve(data);
					},
					error: function (xhr) {
						dfd.reject(xhr);
					}	
				});
			}
		
		}
		
		var getPrice = function(dataType, skuid, priceFunc) {
			ajaxPrice(dataType, skuid, priceFunc);
		}

		function ajaxPrice(dataType, skuid, dtd) {
			var URL_PC = "//p.3.cn/prices/get?type=1&skuid=J_" + skuid; //QQ端

			var getPCPriceAjaxDfd = $.Deferred()

			getPriceAjax(URL_PC, getPCPriceAjaxDfd);
			$.when(getPCPriceAjaxDfd).then(function (data) {
				pricePc = parseFloat(data[0].p).toFixed(2);
				prices[skuid] = pricePc;
				dtd.resolve();
			}, function (xhr) {
				console.log('调用京东API获取PC数据失败！')
				return xhr.reject().promise();
			});


			function getPriceAjax(URL, dfd) {
				$.ajax({
					url: URL,
					dataType: dataType,
					success: function (data) {
						dfd.resolve(data);
					},
					error: function (xhr) {
						dfd.reject(xhr);
					}
				});
			}
		}
		
		function getOrderPrices() {
			for (var e in allGoodsObjs) {
				var skuid = allGoodsObjs[e]['skuId'];
				var price = parseFloat(allGoodsObjs[e]['price'].substr('1')).toFixed(2);
				oPrices[skuid] = price;
			}
		}

		function stockListening() {
			var istock = true, isprice = true;
			runner = setInterval(function () {
				chooseConsignee(); // 选择收件人
				chooseCoupon(); // 选择优惠券
				var stockFunc = $.Deferred();
				var priceFunc = $.Deferred();
				for (var e in allGoodsObjs) {
					skuid = allGoodsObjs[e]['skuId'];
					getStock(JSONP, skuid, stockFunc);
					getPrice(JSONP, skuid, priceFunc);
				}
				$.when(stockFunc, priceFunc).done(function() {
					console.log(stock);
					console.log(prices);
					if ((Object.keys(stock).length == Object.keys(oPrices).length) && (Object.keys(prices).length == Object.keys(oPrices).length)) {
						//console.log('数据准备完成，继续...');
						for (var e in stock) {
							if (stock[e] == 0) {
								istock = false;
								break;
							}
						}
						for (var e in prices) {
							if (prices[e] > oPrices[e]) {
								isprice = false;
								break;
							}
						}
						if (istock && isprice) {
							submitOrder();
						} else {
							div.innerHTML = '无货或价格已变动'+randomDot();
						}
					}
				});
			}, 3000);
		}
		
		function chooseConsignee() {
			var consignee = $('#consignee_index_div_'+consigneeid);
			var classs = $(consignee).attr('class');
			classs = classs.split(' ');
			if ($.inArray('item-selected', classs) == -1) {
				$(consignee)[0].click();
			}
		}
		
		function chooseCoupon() {
			var coupon = $('#selected_coupon_'+couponid);
			var classs = $(coupon).attr('class');
			classs = classs.split(' ');
			if ($.inArray('item-selected', classs) == -1) {
				$(coupon)[0].click();
			}
		}
		
		function submitOrder() {
			var submitBtn = $('#order-submit');
			$(submitBtn)[0].click();
		}

		function runnerStop(target) {
			clearInterval(target);
			isRunning=false;
			window.onbeforeunload='';
		}
		
		function insertHTML() {
			var body = document.body;
			div = document.createElement("div");
			div.setAttribute("id", "custom_info");
			div.setAttribute("style", "position: fixed; z-index: 999; background-color: #FFFF99; padding: 5px; padding:10px; font-size: 20px; width: 100%");
			
			var formdata = document.createElement("input");
			formdata.setAttribute("type", "text");
			formdata.setAttribute("id", "custom_data");
			formdata.setAttribute("style", "padding: 5px;");
			formdata.setAttribute("placeholder", "请补充收货地址ID");
			formdata.setAttribute("value", "");
			
			var binfo = document.createElement("button");
			binfo.setAttribute("style", "margin-left: 20px; padding: 2px 5px; line-height: 25px;");
			binfo.innerHTML = "确认";
			
			body.insertBefore(div, document.getElementsByClassName('header')[0]);
			div.appendChild(formdata);
			div.appendChild(binfo);
			
			binfo.onclick = function (event) {
				if (!consigneeid) {
					consigneeid = getInputVal(formdata, '请补充优惠券ID');
					formdata.value = '';
				} else if (!couponid) {
					couponid = getInputVal(formdata, '');
					div.innerHTML = "数据获取完毕，开启监控";
					doWork();
				}
				
			}
		}
		
		function getInputVal(obj, placeholder) {
			obj.setAttribute("placeholder", placeholder);
			var value = document.getElementById('custom_data').value;
			return value;
		}
		
		function randomDot() {
			var string = ['...', '....', '.....', '......', '.......', '........', '.........'];
			return string[parseInt(6*Math.random())];
		}
		
		function dataInit() {
			allGoodsObjs = cloneGoodsObj(); //cloneGoodsObj 为京东页面配置函数
			allGoodsObjs = allGoodsObjs[0].skuList;
			//var consigneeid = 138225704;
			//var couponid = 6418196108;
			areaIds = {'state_id':19, 'city_id':1684, 'country_id':19467}; 	//地址编号19-1684-19467-51437
			venderId = 0;
		}
		//function cloneGoodsObj(){
		//  var goodsObjs = new Array();
		//  var goodsListEle = $("#skuPayAndShipment-cont  div[class^='goods-list']");
		//  for(var i = 0; i < goodsListEle.length; i++){
		//    var goodsItems = $(goodsListEle[i]).find("div[class^='goods-items']");
		//    for(var j = 0; j < goodsItems.length; j++){
		//      var goodsItem = $(goodsItems[j]);
		//      var goodsSuits = goodsItem.children("div[class^='goods-suit']");
		//      var goodsList = null;
		//      var goodsObj = {};
		//      if(goodsSuits.length > 0){
		//        //处理套装
		//        goodsObj.productType = "suit";
		//        var goodsSuitTit = $(goodsSuits[0]).find("div[class^='goods-suit-tit']");
		//        if(goodsSuitTit.length > 0){
		//          var suitTip = "";
		//          var goodsSuitTitEle = $(goodsSuitTit[0]);
		//          var suitType = goodsSuitTitEle.find("span[class^='sales-icon']");
		//          if(suitType.length <= 0){
		//            suitType = goodsSuitTitEle.find("span[class^='coop-cut-i']");
		//          }
		//          if(suitType.length > 0){
		//              suitTip += "<span class='full-icon ml20'>" + $(suitType[0]).html() + "<b></b></span>";
		//            }
		//          var suitName = goodsSuitTitEle.find("strong");
		//          if(suitName.length > 0){
		//            suitTip += "<span class='full-price ml10'>"+$(suitName[0]).html()+"</span>";
		//          }
		//          var back = goodsSuitTitEle.find("span[class^='ml20']");
		//          if(back.length > 0){
		//        	  suitTip += "<span class='full-recash ml10'>"+  $(back[0]).text()+"</span>";
		//          }
		//          goodsObj.suitName = suitTip;
		//        }
		//        goodsList = $(goodsSuits[0]).find("div[class^='goods-item']");
		//      }else{
		//        //处理单品
		//        goodsObj.productType = "item";
		//        goodsList = goodsItem.find("div[class^='goods-item']");
		//      }
		//      if(goodsList.length > 0){
		//        var cloneObjs = cloneProducts(goodsList);
		//        goodsObj.skuList = cloneObjs;
		//        goodsObjs.push(goodsObj);
		//      }
		//    }
		//  }
		//  return goodsObjs;
		//}window.cloneGoodsObj = cloneGoodsObj;
		
		function doWork() {
			
			isRunning=true;
			window.onbeforeunload = function(event){   
				return '当前正在监听网页，确认立即退出？'; 
			};
			
			dataInit(); // 初始化数据
			getOrderPrices(); // 获取下单价格
			chooseConsignee(); // 选择收件人
			chooseCoupon(); // 选择优惠券
			stockListening();  //一键查库存事件监听显示库存列表
		}
		
		insertHTML(); //插入相关DOM HTML
	}
})();