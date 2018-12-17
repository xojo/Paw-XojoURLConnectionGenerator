var XojoNewCodeGenerator = function() {
	this.generate = function(context, requests, options) {
		for(var i in requests) {
			var request = requests[i];
		
			var client_code = [];
		
			if(request.name) {
				client_code[client_code.length] = "// " + request.name;
			}
			if (request.description != "") {
				client_code[client_code.length] = "// " + request.description;
			}
			client_code[client_code.length] = "";
		
			var secure = (request.url.indexOf("https://")>-1);
			if(!secure) {
				client_code[client_code.length] = "// NOTE: Starting with Xojo 2018r4, use of insecure connections";
				client_code[client_code.length] = "// in a macOS app requires the addition of the following plist key:";
				client_code[client_code.length] = "// <key>NSAppTransportSecurity</key>";
				client_code[client_code.length] = "// <dict><key>NSAllowsArbitraryLoads</key><true/></dict>";
				client_code[client_code.length] = "";
			}
			
			var vars = request.variables;
			if (vars.length > 0) {
				client_code[client_code.length] = "// Variable Definitions"
				for(i=0; i<vars.length; i++) {
					var desc = "// " + vars[i].name + ": " + vars[i].description;
					if (vars[i].required) {
						desc += " (required)";
					}
					client_code[client_code.length] = desc;
					client_code[client_code.length] = "// " + vars[i].type;
				}
				client_code[client_code.length] = "";
			}
		
			client_code[client_code.length] = "// Set up the socket";
			client_code[client_code.length] = "Dim mySocket as new URLConnection";	
			var headers = request.headers;
			for (var headerName in headers) {
				var headerValue = headers[headerName];
				if(!(request.body != "" && headerName == "Content-Type")) {
					client_code[client_code.length] = "mySocket.RequestHeader(\"" + headerName + "\") = \"" + headerValue + "\"";	
				}
			}
			client_code[client_code.length] = "";
		
			var body;
			var mimeType;
			// Figure out what kind of body the user specified
			if(request.multipartBody) {
				body = request.multipartBody;
				if(Object.size(body) > 0) {
					mimeType = "multipart/form-data";
					client_code[client_code.length] = "// Multipart";
					client_code[client_code.length] = "Dim strArr() as String";
					for(var propertyName in body) {
						var key = propertyName;
						var value = body[key];
						client_code[client_code.length] = "strArr.append \"" + key + "=" + encodeURIComponent(value) + "\"";
					}
					client_code[client_code.length] = "Dim data as String = Join(strArr,\"&\")";
				}
			} else if(request.jsonBody) {
				mimeType = "application/json";
				client_code[client_code.length] = "// JSON"
				client_code[client_code.length] = "Dim js as new JSONItem";
				client_code[client_code.length] = parseJSON(request.jsonBody,"js");
				client_code[client_code.length] = "Dim data as String = js.toString()"
			} else if(request.urlEncodedBody) {
				body = request.urlEncodedBody;
				if(Object.size(body) > 0) {
					mimeType = "application/x-www-form-urlencoded";
					client_code[client_code.length] = "Dim strArr() as String";
					for(var propertyName in body) {
						var key = propertyName;
						var value = body[key];
						client_code[client_code.length] = "strArr.append \"" + key + "=\" + EncodeURLComponent(\"" + value + "\")";
					}
					client_code[client_code.length] = "Dim data as String = Join(strArr,\"&\")";
				}
			} else if(request.body) {
				if(request.body.length > 0) {
					var replaceCRLF = new RegExp('\n', 'g');
					var replaceQuotes = new RegExp('\"', 'g');
					body = request.body;
					mimeType = "text/plain";
					// Some generic body data
					client_code[client_code.length] = "// Put raw data into a String";
					client_code[client_code.length] = "Dim data as String = \"" + body.replace(replaceQuotes,"\"\"").replace(replaceCRLF, "\" + EndOfLine.Windows + \"") + "\"";
				}
			}
	
			if(mimeType) {
				client_code[client_code.length] = "";
				client_code[client_code.length] = "// Assign to the Request's Content";
				client_code[client_code.length] = "mySocket.SetRequestContent(data,\"" + mimeType + "\")";
				client_code[client_code.length] = "";
			}
			
			// Put the URL parameters
			var paramNames = request.getUrlParametersNames();
			var params = request.getUrlParameters();
			if(paramNames.length > 0) {
				client_code[client_code.length] = "// URL Parameters";
				client_code[client_code.length] = "dim parameters() as string";
				for(i=0;i<paramNames.length;i++) {
					client_code[client_code.length] = "parameters.append \"" + paramNames[i] + "=\" + EncodeURLComponent(\"" + params[paramNames[i]] + "\")";
				}
				client_code[client_code.length] = "";
			}
			client_code[client_code.length] = "// Set the URL";
			client_code[client_code.length] = "dim url as string = \"" + request.getUrlBase(false) + "\"";
			// If any parameters have been defined, append them to the url
			if(paramNames.length > 0) {
				client_code[client_code.length] = "url = url + \"?\" + Join(parameters,\"&\")";
			}
			client_code[client_code.length] = ""
			client_code[client_code.length] = "// Send Synchronous Request"
			var timeout = request.timeout;
			// If the user hasn't specified a timeout, use 30 seconds
			if(timeout=="") { timeout = 30000; }
			client_code[client_code.length] = "dim s as String = mySocket.SendSync(\"" + request.method + "\", url, " + Math.floor(timeout / 1000) + ")";
			return client_code.join("\r");
		}
	}
}

XojoNewCodeGenerator.identifier = "com.xojo.PawExtensions.SyncURLConnectionCodeGenerator";

XojoNewCodeGenerator.title = "Xojo Synchronous URLConnection";

XojoNewCodeGenerator.fileExtension = "xojo_code";

registerCodeGenerator(XojoNewCodeGenerator);

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var alreadyDefinedVars = [];
parseJSON = function(obj, varname) {
	var items = [];
	for (key in obj) {
		var value = obj[key];
		var prefix = varname + ".value(\"" + key + "\") = "
		if(isNaN(key) !== true) {
			prefix = varname + ".append "
		}
		if(value == null) {
			items[items.length] = prefix + "nil";
		} else if(typeof value == "string") {
			items[items.length] = prefix + "\"" + value + "\"";
		} else if(typeof value == "number") {
			items[items.length] = prefix + value;
		} else if(typeof value == "boolean") {
			items[items.length] = prefix + value;
		} else {
			items[items.length] = "";
			items[items.length] = "// Define a new JSONItem for \"" + key + "\"";
			if(alreadyDefinedVars.indexOf(key) > -1) {
				items[items.length] = key + " = new JSONItem";
			} else {
				items[items.length] = "Dim " + key + " as new JSONItem";
				alreadyDefinedVars[alreadyDefinedVars.length] = key
			}
			var oldkey = key;
			items[items.length] = parseJSON(value, key);
			items[items.length] = varname + ".value(\"" + oldkey + "\") = " + oldkey;
		}
	}	
	items[items.length] = "";
	return items.join("\r");
}
