/*
 * FancyBox (The Schiller Remix) - simple jQuery plugin for fancy image zooming
 * Examples and documentation at: http://fancy.klade.lv/
 * Version: 0.1 (12/01/2009)
 * Original Code Copyright (c) 2008 Janis Skarnelis
 * Refactored Code Copyright (c) 2009 Joel Courtney
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 * Requires: jQuery v1.2.1 or later, pngFix ( http://jquery.andreaseberhard.de/pngFix/ )
 * Uses Scott Schiller Even More Rounded Corners ( http://www.schillmania.com/projects/dialog2/ )
*/
(function($) {
    var imgPreloader = new Image, imgTypes = ['png', 'jpg', 'jpeg', 'gif'], loadingTimer, loadingFrame = 1;
    
    $.fn.fancybox = function(settings) {
        var defaults = {
            hideOnContentClick: false,
            zoomSpeedIn:        500,
            zoomSpeedOut:       500,
            frameWidth:         600,
            frameHeight:        400,
            overlayShow:        false,
            overlayOpacity:     0.4,
            itemLoadCallback:   null,
            showLoading:        true,
            random:             true,
            followBrowserSize:  false,
            inline:             false,
            content:            null,
            startCallback:      null,
            closeCallback:      null 
        };
        
        var opts = {
            itemArray: [],
            itemNum: 0,
            settings: $.extend({}, defaults, settings)
        };

        var changeItem = function(n) {
            if (opts.itemArray[n].o.showLoading) {
                showLoading();
            }

            opts.itemNum = n;

            $("#fancy_nav").empty();
            $("#fancy_outer").stop();
            $("#fancy_title").hide();
            $(document).unbind("keydown");

            imgRegExp = imgTypes.join('|');
            imgRegExp = new RegExp('\.' + imgRegExp + '$', 'i');

            var url = opts.itemArray[n].url;
            if (opts.settings.content) {
                showItem('<div id="fancy_div">' + opts.settings.content + '</div>');
                $("#fancy_loading").hide();
            } else if (url.match(/#/)) {
                var target = window.location.href.split('#')[0]; target = url.replace(target,'');

                showItem('<div id="fancy_div">' + $(target).html() + '</div>');

                $("#fancy_loading").hide();

            } else if (url.match(imgRegExp)) {
                $(imgPreloader).unbind('load').bind('load', function() {
                    $("#fancy_loading").hide();

                    opts.itemArray[n].o.frameWidth  = imgPreloader.width;
                    opts.itemArray[n].o.frameHeight = imgPreloader.height;

                    showItem('<img id="fancy_img" src="' + imgPreloader.src + '" />');

                }).attr('src', url + (opts.itemArray[n].o.random? '?rand=' + Math.floor(Math.random() * 999999999): ""));

            } else {
                showItem('<iframe id="fancy_frame" onload="showIframe()" name="fancy_iframe' +
                    (opts.itemArray[n].o.random? Math.round(Math.random()*1000) + '" frameborder="0" hspace="0" src="' + url + '"></iframe>': ""));
            }
        };
        
        var start = function(el) {
            var o = opts.settings;
            if (opts.animating) return false;

            if (!o.inline && o.overlayShow) {
                $("#fancy_wrap").prepend('<div id="fancy_overlay"></div>');
                $("#fancy_overlay").css({'width': $(window).width(), 'height': $(document).height(), 'opacity': o.overlayOpacity});

                if ($.browser.msie) {
                    $("#fancy_wrap").prepend('<iframe id="fancy_bigIframe" scrolling="no" frameborder="0"></iframe>');
                    $("#fancy_bigIframe").css({'width': $(window).width(), 'height': $(document).height(), 'opacity': 0});
                }

                $("#fancy_overlay").click(close);
            }
            $("#fancy_close").unbind('click').click(close);


            if (jQuery.isFunction(o.itemLoadCallback)) {
               o.itemLoadCallback.apply(this, [opts]);

                var c   = $(el).children("img:first").length ? $(el).children("img:first") : $(el);
                var tmp = {'width': c.width(), 'height': c.height(), 'pos': getPosition(c)};

               for (var i = 0; i < opts.itemArray.length; i++) {
                    opts.itemArray[i].o = $.extend({}, o, opts.itemArray[i].o);

                    if (o.zoomSpeedIn > 0 || o.zoomSpeedOut > 0) {
                        opts.itemArray[i].orig = tmp;
                    }
               }

            } else {
                if (!el.rel || el.rel == '') {
                    var item = {url: el.href, title: el.title, o: o};

                    if (o.zoomSpeedIn > 0 || o.zoomSpeedOut > 0) {
                        var c = $(el).children("img:first").length ? $(el).children("img:first") : $(el);
                        item.orig = {'width': c.width(), 'height': c.height(), 'pos': getPosition(c)};
                    }

                    opts.itemArray.push(item);
					opts.itemNum = opts.itemArray.length - 1;

                } else {
                    var arr = $("a[rel=" + el.rel + "]").get();

                    for (var i = 0; i < arr.length; i++) {
                        var item    = {url: arr[i].href, title: arr[i].title, o: o};

                        if (o.zoomSpeedIn > 0 || o.zoomSpeedOut > 0) {
                            var c = $(arr[i]).children("img:first").length ? $(arr[i]).children("img:first") : $(el);
                            item.orig = {'width': c.width(), 'height': c.height(), 'pos': getPosition(c)};
                        }

                        if (arr[i].href == el.href) opts.itemNum = i;

                        opts.itemArray.push(item);
                    }
                }
            }
            if (opts.settings.startCallback) opts.settings.startCallback();
            changeItem(opts.itemNum);
        };

        var showIframe = function() {
            $("#fancy_loading").hide();
            $("#fancy_frame").show();
        };

        var showItem = function(val) {
            preloadNeighborImages();

            var viewportPos = getViewport();
            var itemSize    = getMaxSize(viewportPos[0] - 50, viewportPos[1] - 100, opts.itemArray[opts.itemNum].o.frameWidth, opts.itemArray[opts.itemNum].o.frameHeight);

            var itemLeft    = viewportPos[2] + Math.round((viewportPos[0] - itemSize[0]) / 2) - 20;
            var itemTop     = viewportPos[3] + Math.round((viewportPos[1] - itemSize[1]) / 2) - 100;

            var itemOpts = {
                'left':     itemLeft, 
                'top':      itemTop, 
                'width':    itemSize[0] + 'px', 
                'height':   itemSize[1] + 'px'  
            };

            if (opts.active) {
                $('#fancy_content').fadeOut("normal", function() {
                    $("#fancy_content").empty();

                    $("#fancy_outer").animate(itemOpts, "normal", function() {
                        $("#fancy_content").append($(val)).fadeIn("normal");
                        updateDetails();
                    });
                });

            } else {
                opts.active = true;

                $("#fancy_content").empty();

                if ($("#fancy_content").is(":animated")) {
                    console.info('animated!');
                }

                if (opts.itemArray[opts.itemNum].o.zoomSpeedIn > 0) {
                    opts.animating      = true;
                    itemOpts.opacity    = "show";

                    $("#fancy_outer").css({
                        'top':      opts.itemArray[opts.itemNum].orig.pos.top,
                        'left':     opts.itemArray[opts.itemNum].orig.pos.left,
                        'height':   opts.itemArray[opts.itemNum].orig.height,
                        'width':    opts.itemArray[opts.itemNum].orig.width
                    });

                    $("#fancy_content").append($(val)).show();

                    $("#fancy_outer").animate(itemOpts, opts.itemArray[opts.itemNum].o.zoomSpeedIn, function() {
                        opts.animating = false;
                        updateDetails();
                    });

                } else {
                    $("#fancy_content").append($(val)).show();
                    $("#fancy_outer").css(itemOpts).show();
                    updateDetails();
                }
             }
        };

        var resizeItem = function() {
            val = $("#fancy_img");

            var viewportPos = getViewport();
            var itemSize    = getMaxSize(viewportPos[0] - 50, viewportPos[1] - 100, opts.itemArray[opts.itemNum].o.frameWidth, opts.itemArray[opts.itemNum].o.frameHeight);

            var itemLeft    = viewportPos[2] + Math.round((viewportPos[0] - itemSize[0]) / 2) - 20;
            var itemTop     = viewportPos[3] + Math.round((viewportPos[1] - itemSize[1]) / 2) - 100;

            var itemOpts = {
                'left':     itemLeft, 
                'top':      itemTop, 
                'width':    itemSize[0] + 'px', 
                'height':   itemSize[1] + 'px'  
            };

            $("#fancy_outer").css(itemOpts);
            updateDetails();

            if (opts.itemArray[opts.itemNum].o.overlayShow) {
                $("#fancy_overlay").css({'width': $(window).width(), 'height': $(document).height(), 'opacity': opts.itemArray[opts.itemNum].o.overlayOpacity});

                if ($.browser.msie) {
                    $("#fancy_bigIframe").css({'width': $(window).width(), 'height': $(document).height(), 'opacity': 0});
                }
            }
        };

        var updateDetails = function() {
            if (!opts.itemArray[opts.itemNum].o.inline) {
                $("#fancy_bg,#fancy_close").show();
            }

            if (opts.itemArray[opts.itemNum].title !== undefined && opts.itemArray[opts.itemNum].title !== '') {
                $('#fancy_title div.fancy_copy').html(opts.itemArray[opts.itemNum].title);
				$('#fancy_title .fancy_dialog').css({'margin' : '0 auto', 'width' : "100%"})
                $('#fancy_title').show();
				$('#fancy_title .fancy_dialog').css({'margin' : '0 auto', 'width' : ($('div#fancy_title .fancy_copy').width()+14)+"px"})
				$('#fancy_title').css({'bottom' : "-"+($('#fancy_title').height() + 10)+"px"});
            }

            $("#fancy_content").unbind('click');
            if (opts.itemArray[opts.itemNum].o.hideOnContentClick) {
                $("#fancy_content").click(close);
            }

            if (opts.itemArray[opts.itemNum].o.inline) {
                $("#fancy_nav").empty();
            }

            if (opts.itemNum != 0) {
                $("#fancy_nav").append('<a id="fancy_left" href="javascript:;"></a>');

                $('#fancy_left').click(function() {
                    changeItem(opts.itemNum - 1); return false;
                });
            }

            if (opts.itemNum != (opts.itemArray.length - 1)) {
                $("#fancy_nav").append('<a id="fancy_right" href="javascript:;"></a>');

                $('#fancy_right').click(function(){
                    changeItem(opts.itemNum + 1); return false;
                });
            }

            $(document).keydown(function(event) {
                if (event.keyCode == 27) {
                    close();

                } else if(event.keyCode == 37 && opts.itemNum != 0) {
                    changeItem(opts.itemNum - 1);

                } else if(event.keyCode == 39 && opts.itemNum != (opts.itemArray.length - 1)) {
                    changeItem(opts.itemNum + 1);
                }
            });
        };

        var preloadNeighborImages = function() {
            if ((opts.itemArray.length - 1) > opts.itemNum) {
                preloadNextImage = new Image();
                preloadNextImage.src = opts.itemArray[opts.itemNum + 1].url;
            }

            if (opts.itemNum > 0) {
                preloadPrevImage = new Image();
                preloadPrevImage.src = opts.itemArray[opts.itemNum - 1].url;
            }
        };

        var close = function() {
            if (opts.animating) return false;
            if (opts.settings.closeCallback) { 
                var res = opts.settings.closeCallback();
                if (res===false) return; // close action canceled
            }
            
            $(imgPreloader).unbind('load');
            $(document).unbind("keydown");

            $("#fancy_loading,#fancy_title,#fancy_close,#fancy_bg").hide();

            $("#fancy_nav").empty();

            opts.active = false;

            if (opts.itemArray[opts.itemNum].o.zoomSpeedOut > 0) {
                var itemOpts = {
                    'top':      opts.itemArray[opts.itemNum].orig.pos.top,
                    'left':     opts.itemArray[opts.itemNum].orig.pos.left,
                    'height':   opts.itemArray[opts.itemNum].orig.height,
                    'width':    opts.itemArray[opts.itemNum].orig.width,
                    'opacity':  'hide'
                };

                opts.animating = true;

                $("#fancy_outer").animate(itemOpts, opts.itemArray[opts.itemNum].o.zoomSpeedOut, function() {
                    $("#fancy_content").hide().empty();
                    $("#fancy_overlay,#fancy_bigIframe").remove();
                    opts.animating = false;
                });

            } else {
                $("#fancy_outer").hide();
                $("#fancy_content").hide().empty();
                $("#fancy_overlay,#fancy_bigIframe").fadeOut("fast").remove();
            }
            opts.itemNum = 0;
        };

        var showLoading = function() {
            clearInterval(loadingTimer);

            var pos = getViewport();

            $("#fancy_loading").css({'left': ((pos[0] - 100) / 2 + pos[2]), 'top': ((pos[1] - 100) / 2 + pos[3])}).show();
            $("#fancy_loading").bind('click', close);

            loadingTimer = setInterval(animateLoading, 66);
        };

        var animateLoading = function(el, o) {
            if (!$("#fancy_loading").is(':visible')){
                clearInterval(loadingTimer);
                return;
            }

            $("#fancy_loading > div").css('top', (loadingFrame * -40) + 'px');

            loadingFrame = (loadingFrame + 1) % 12;
        };

        var init = function() {
            if (!$('#fancy_wrap').length) {
                $('<div id="fancy_wrap"></div>').appendTo("body");
            }
            if (1 /* XXX fancy_wrap has no children */) {
                $('<div id="fancy_loading"><div></div></div><div id="fancy_outer"><div id="fancy_inner"><div id="fancy_nav"></div><div id="fancy_close"></div><div id="fancy_content"></div><div id="fancy_title"></div></div></div>').appendTo("#fancy_wrap");
                $('<div id="fancy_bg"><div class="fancy_bg fancy_bg_n"></div><div class="fancy_bg fancy_bg_ne"></div><div class="fancy_bg fancy_bg_e"></div><div class="fancy_bg fancy_bg_se"></div><div class="fancy_bg fancy_bg_s"></div><div class="fancy_bg fancy_bg_sw"></div><div class="fancy_bg fancy_bg_w"></div><div class="fancy_bg fancy_bg_nw"></div></div>').prependTo("#fancy_inner");

                $('<div class="fancy_dialog"><div class="fancy_content"><div class="fancy_t"></div><!--Your content goes here--><div class="fancy_copy"></div></div><div class="fancy_b"><div></div></div></div>').appendTo('#fancy_title');
            }

            if ($.browser.msie) {
                $("#fancy_inner").prepend('<iframe id="fancy_freeIframe" scrolling="no" frameborder="0"></iframe>');
            }

            if (jQuery.fn.pngFix) {
				$("#fancy_wrap").pngFix();
			}
        };

        var getPosition = function(el) {
            var pos = el.offset();

            pos.top += num(el, 'paddingTop');
            pos.top += num(el, 'borderTopWidth');

            pos.left += num(el, 'paddingLeft');
            pos.left += num(el, 'borderLeftWidth');

            return pos;
        };

        var num = function (el, prop) {
            return parseInt($.curCSS(el.jquery?el[0]:el,prop,true), 10)||0;
        };

        var getPageScroll = function() {
            var xScroll, yScroll;

            if (self.pageYOffset) {
                yScroll = self.pageYOffset;
                xScroll = self.pageXOffset;
            } else if (document.documentElement && document.documentElement.scrollTop) {
                yScroll = document.documentElement.scrollTop;
                xScroll = document.documentElement.scrollLeft;
            } else if (document.body) {
                yScroll = document.body.scrollTop;
                xScroll = document.body.scrollLeft; 
            }

            return [xScroll, yScroll]; 
        };

        var getViewport = function() {
            var scroll = getPageScroll();

            return [$(window).width(), $(window).height(), scroll[0], scroll[1]];
        };

        var getMaxSize = function(maxWidth, maxHeight, imageWidth, imageHeight) {
            var r = Math.min(Math.min(maxWidth, imageWidth) / imageWidth, Math.min(maxHeight, imageHeight) / imageHeight);

            return [Math.round(r * imageWidth), Math.round(r * imageHeight)];
        };

        var getCurrentItemNum = function() {
          return opts.itemNum;
        };

        ///////////////////////////////////////////////////////////////////////////////////////
        
        init();

        if (opts.settings.followBrowserSize) {
            function doSomething() {
                var item = getCurrentItemNum();
                if (item == null) {
                  return;
                }
              resizeItem();
            };

            var resizeTimer = null;
            $(window).bind('resize', function() {
              doSomething();
              // if (resizeTimer) clearTimeout(resizeTimer);
              // resizeTimer = setTimeout(doSomething, 100);
            });
        }

        return this.each(function() {
            var $this = $(this);

            $this.unbind('click').click(function() {
                start(this); 
                return false;
            });
        });
    };
})(jQuery);
