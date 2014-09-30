var muen = require('./muen');
var url = require('url');
var fs = require('fs');
var path = require('path');

var router = {};
router.createHandler = function(opt){
  var ret = {};
  var opt = opt ||{};
  ret.name = "";
  ret.doGet = typeof(opt.doGet)=="function"? opt.doGet : function(request, response){
    response.write("Index Of " + this.name + "\r\n");
    for(var k in this.items){
      response.write(k + "\r\n");
    }
    response.end();
  };
  ret.doPost = typeof(opt.doPost)=="function"? opt.doPost : function(request, response, data){this.doGet(request, response)};
  ret.doCreate = typeof(opt.doCreate)=="function"? opt.doCreate : function(){};
  ret.doDestroy = typeof(opt.doDestroy)=="function"? opt.doDestroy : function(){};
  ret.items = {};
  ret.addItem = function(name, handler){
    var hdl = handler;
    if(typeof(handler)=="function"){
      hdl = router.createHandler({doGet: handler});
    }
    hdl.name = name;
    hdl.doCreate();
    this.items[name] = hdl;
  }
  ret.getHandler = function(path){
    var p = path.indexOf("/");
    var mname = (p==-1) ? path : path.slice(0,p);  
    var item = this.items[mname];
    if(item){
      return item.getHandler(path.slice(p+1));
    }
    return this;
  }
  return ret;
}
router.root = router.createHandler({});

router.root.name = "/";

router.root.addItem("home", router.createHandler({
    doGet: function(request, response){
      var address = url.parse(request.url);
      var pn = address.pathname;
      var rp = "." + path.join(pn);
      var mine = {
        "css" : "text/css",
        "gif" : "image/gif",
        "htm" : "text/html",
        "html" : "text/html",
        "ico" : "image/x-icon",
        "jpeg" : "image/jpeg",
        "jpg" : "image/jpeg",
        "js" : "text/javascript",
        "json" : "application/json",
        "pdf" : "application/pdf",
        "png" : "image/png",
        "svg" : "image/svg+xml",
        "swf" : "application/x-shockwave-flash",
        "tiff" : "image/tiff",
        "txt" : "text/plain",
        "wav" : "audio/x-wav",
        "wma" : "audio/x-ms-wma",
        "wmv" : "video/x-ms-wmv",
        "xml" : "text/xml"
      };
      //console.log(rp);
      var ext = path.extname(rp);
      ext = ext ? ext.slice(1) : 'unknown';
      fs.exists(rp, function (exists) {
        if (!exists) {
          response.writeHead(404, {
            'Content-Type' : 'text/plain'
          });
          
          response.end("404 Not Found");
        } 
        else {
          fs.stat(rp, function(err, stats){
            if(stats.isDirectory()){
              response.end("directory");
            }
            else{
              fs.readFile(rp, "binary", function (err, file) {
                if (err) {
                  response.writeHead(500, {
                    'Content-Type' : 'text/plain'
                  });
                  response.end(err);
                } else {
                  var contentType = mine[ext] || "text/plain";
                  response.writeHead(200, {
                    'Content-Type' : contentType
                  });
                  response.write(file, "binary");
                  response.end();
                }
              });
            }
          })
        }
      });
    },
    doPost: function(request, response){
      this.doGet(request, response);
    }
  })
);

router.root.addItem("bin", router.createHandler({
    doCreate: function(){
      this.addItem("now.do", router.createHandler({
        doGet: function(request, response){
          response.end(muen.now());
        }
      }));
      this.addItem("about.do", router.createHandler({
        doGet: function(request, response){
          response.write("Router v0.0.1 \r\n");
          response.write("By Bamboo [bimwook@foxmail.com]");
          response.end();
        }
      }));      
    }
  })
);

router.root.bin = router.root.getHandler("bin");

router.handler = function(request, response){
  var address = url.parse(request.url);
  var path = address.pathname;
  var h = this.root.getHandler(path.slice(1));

  if(h){
    response.writeHead(200, {
      'Server' : 'node.js',
      'X-Powered-By' : 'router v0.0.1'
    });
    switch(request.method){
      case "GET": {
        h.doGet(request, response);
        break;
      }
      case "POST" :{
        var data = "";
        request.on("data", function(chunk){
          data += chunk;
        });
        request.on("end", function(){    
          h.doPost(request, response, data);
        })
      
        break;
      }
    }
    
  }
  else{
    response.write("404");
    response.end();
  }
};
module.exports = router;